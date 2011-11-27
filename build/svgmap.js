(function() {

  /*
      svgmap - a simple toolset that helps creating interactive thematic maps
      Copyright (C) 2011  Gregor Aisch
  
      This program is free software: you can redistribute it and/or modify
      it under the terms of the GNU General Public License as published by
      the Free Software Foundation, either version 3 of the License, or
      (at your option) any later version.
  
      This program is distributed in the hope that it will be useful,
      but WITHOUT ANY WARRANTY; without even the implied warranty of
      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
      GNU General Public License for more details.
  
      You should have received a copy of the GNU General Public License
      along with this program.  If not, see <http://www.gnu.org/licenses/>.
  */

  var MapLayer, MapLayerPath, SVGMap, root, svgmap, _ref;

  root = typeof exports !== "undefined" && exports !== null ? exports : this;

  svgmap = (_ref = root.svgmap) != null ? _ref : root.svgmap = {};

  svgmap.version = "0.1.0";

  /*
  Usage:
  
  svgmap = new SVGMap(container);
  
  // load a new map, will reset everything, so you need to setup the layers again
  
  svgmap.loadMap('map.svg', function(layers) {
  	svgmap.addLayer('sea');
  	svgmap.addLayer('countries','country_bg');
  	svgmap.addLayer('graticule');
  	svgmap.addLayer('countries');
  });
  
  // setup layers
  
  // load data
  */

  SVGMap = (function() {

    function SVGMap(container) {
      var cnt, me, vp;
      me = this;
      me.container = cnt = $(container);
      me.viewport = vp = new svgmap.BBox(0, 0, cnt.width(), cnt.height());
      me.paper = Raphael(cnt[0], vp.width, vp.height);
      me.markers = [];
    }

    SVGMap.prototype.loadMap = function(mapurl, callback) {
      var me;
      me = this;
      me.mapLoadCallback = callback;
      $.ajax({
        url: mapurl,
        success: me.mapLoaded,
        context: me
      });
    };

    SVGMap.prototype.addLayer = function(src_id, layer_id, path_id) {
      var $paths, layer, me, svg_path, _i, _len, _ref2, _ref3, _results;
      me = this;
      if (layer_id == null) layer_id = src_id;
      if ((_ref2 = me.layerIds) == null) me.layerIds = [];
      me.layerIds.push(layer_id);
      layer = new MapLayer(layer_id, path_id, me.paper, me.viewBC);
      if ((_ref3 = me.layers) == null) me.layers = {};
      me.layers[layer_id] = layer;
      $paths = $('path', $('g#' + src_id, me.svgSrc)[0]);
      _results = [];
      for (_i = 0, _len = $paths.length; _i < _len; _i++) {
        svg_path = $paths[_i];
        _results.push(layer.addPath(svg_path));
      }
      return _results;
    };

    SVGMap.prototype.addLayerEvent = function(layer_id, event, callback) {
      var me, path, paths, _i, _len, _results;
      me = this;
      paths = me.layers[layer_id].paths;
      _results = [];
      for (_i = 0, _len = paths.length; _i < _len; _i++) {
        path = paths[_i];
        _results.push($(path.svgPath.node).bind(event, callback));
      }
      return _results;
    };

    SVGMap.prototype.addMarker = function(marker) {
      var me, xy;
      me = this;
      me.markers.push(marker);
      xy = me.viewBC.project(me.viewAB.project(me.proj.project(marker.lonlat.lon, marker.lonlat.lat)));
      return marker.render(xy[0], xy[1], me.container, me.paper);
    };

    SVGMap.prototype.choropleth = function(opts) {
      var col, colorscale, data, data_col, id, layer_id, me, no_data_color, path, pathData, paths, row, v, _ref2, _ref3, _ref4, _ref5, _results;
      me = this;
      layer_id = (_ref2 = opts.layer) != null ? _ref2 : me.layerIds[me.layerIds.length - 1];
      data = opts.data;
      data_col = opts.prop;
      no_data_color = (_ref3 = opts.nodata) != null ? _ref3 : '#ccc';
      colorscale = (_ref4 = opts.colorscale) != null ? _ref4 : svgmap.color.scale.COOL;
      colorscale.parseData(data, data_col);
      pathData = {};
      for (id in data) {
        row = data[id];
        pathData[id] = row[data_col];
      }
      _ref5 = me.layers[layer_id].pathsById;
      _results = [];
      for (id in _ref5) {
        paths = _ref5[id];
        _results.push((function() {
          var _i, _len, _results2;
          _results2 = [];
          for (_i = 0, _len = paths.length; _i < _len; _i++) {
            path = paths[_i];
            if (pathData[id] != null) {
              v = pathData[id];
              col = colorscale.getColor(v);
              _results2.push(path.svgPath.node.setAttribute('style', 'fill:' + col));
            } else {
              _results2.push(path.svgPath.node.setAttribute('style', 'fill:' + no_data_color));
            }
          }
          return _results2;
        })());
      }
      return _results;
    };

    SVGMap.prototype.tooltips = function(opts) {
      var cfg, id, id_col, layer_id, me, path, paths, tooltips, tt, _ref2, _ref3, _results;
      me = this;
      tooltips = opts.content;
      id_col = opts.id;
      layer_id = (_ref2 = opts.layer) != null ? _ref2 : me.layerIds[me.layerIds.length - 1];
      _ref3 = me.layers[layer_id].pathsById;
      _results = [];
      for (id in _ref3) {
        paths = _ref3[id];
        _results.push((function() {
          var _i, _len, _results2;
          _results2 = [];
          for (_i = 0, _len = paths.length; _i < _len; _i++) {
            path = paths[_i];
            if ($.isFunction(tooltips)) {
              tt = tooltips(id, path);
            } else {
              tt = tooltips[id];
            }
            if (tt != null) {
              cfg = {
                position: {
                  target: 'mouse',
                  viewport: $(window),
                  adjust: {
                    x: 7,
                    y: 7
                  }
                },
                show: {
                  delay: 20
                },
                content: {}
              };
              if (typeof tt === "string") {
                cfg.content.text = tt;
              } else if ($.isArray(tt)) {
                cfg.content.title = tt[0];
                cfg.content.text = tt[1];
              }
              _results2.push($(path.svgPath.node).qtip(cfg));
            } else {
              _results2.push(void 0);
            }
          }
          return _results2;
        })());
      }
      return _results;
    };

    /*
    		for some reasons, this runs horribly slow in Firefox
    		will use pre-calculated graticules instead
    
    	addGraticule: (lon_step=15, lat_step) ->
    		
    		self = @
    		lat_step ?= lon_step
    		globe = self.proj
    		v0 = self.viewAB
    		v1 = self.viewBC
    		viewbox = v1.asBBox()
    		
    		grat_lines = []
    		
    		for lat in [0..90] by lat_step
    			lats = if lat == 0 then [0] else [lat, -lat]
    			for lat_ in lats
    				if lat_ < globe.minLat or lat_ > globe.maxLat
    					continue
    				pts = []
    				lines = []
    				for lon in [-180..180]
    					console.log lat_,lon
    					if globe._visible(lon, lat_)
    						xy = v1.project(v0.project(globe.project(lon, lat_)))
    						pts.push xy
    					else
    						if pts.length > 1
    							line = new svgmap.geom.Line(pts)
    							pts = []
    							lines = lines.concat(line.clipToBBox(viewbox))
    				
    				if pts.length > 1
    					line = new svgmap.geom.Line(pts)
    					pts = []
    					lines = lines.concat(line.clipToBBox(viewbox))
    					
    				for line in lines
    					path = self.paper.path(line.toSVG())
    					path.setAttribute('class', 'graticule latitude lat_'+Math.abs(lat_)+(if lat_ < 0 then 'W' else 'E'))
    					grat_lines.push(path)
    */

    SVGMap.prototype.display = function() {
      /*
      		finally displays the svgmap, needs to be called after
      		layer and marker setup is finished
      */      return this.render();
    };

    /* 
    	    end of public API
    */

    SVGMap.prototype.mapLoaded = function(xml) {
      var $view, AB, me, vp;
      me = this;
      me.svgSrc = xml;
      vp = me.viewport;
      $view = $('view', xml)[0];
      me.viewAB = AB = svgmap.View.fromXML($view);
      me.viewBC = new svgmap.View(AB.asBBox(), vp.width, vp.height);
      me.proj = svgmap.Proj.fromXML($('proj', $view)[0]);
      return me.mapLoadCallback();
    };

    SVGMap.prototype.loadCoastline = function() {
      var me;
      me = this;
      return $.ajax({
        url: 'coastline.json',
        success: me.renderCoastline,
        context: me
      });
    };

    SVGMap.prototype.renderCoastline = function(coastlines) {
      var P, d, i, line, me, p0, p1, pathstr, view0, view1, vp, _i, _len, _ref2, _results;
      me = this;
      P = me.proj;
      vp = me.viewport;
      view0 = me.viewAB;
      view1 = me.viewBC;
      _results = [];
      for (_i = 0, _len = coastlines.length; _i < _len; _i++) {
        line = coastlines[_i];
        pathstr = '';
        for (i = 0, _ref2 = line.length - 2; 0 <= _ref2 ? i <= _ref2 : i >= _ref2; 0 <= _ref2 ? i++ : i--) {
          p0 = line[i];
          p1 = line[i + 1];
          d = 0;
          if (true && P._visible(p0[0], p0[1]) && P._visible(p1[0], p1[1])) {
            p0 = view1.project(view0.project(P.project(p0[0], p0[1])));
            p1 = view1.project(view0.project(P.project(p1[0], p1[1])));
            if (vp.inside(p0[0], p0[1]) || vp.inside(p1[0], p1[1])) {
              pathstr += 'M' + p0[0] + ',' + p0[1] + 'L' + p1[0] + ',' + p1[1];
            }
          }
        }
        if (pathstr !== "") {
          _results.push(me.paper.path(pathstr).attr('opacity', .8));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    SVGMap.prototype.onPathEvent = function(evt) {
      /*
      		forwards path events to their callbacks, but attaches the path to
      		the event object
      */
      var me, path;
      me = this;
      path = evt.target.path;
      return me.layerEventCallbacks[path.layer][evt.type](path);
    };

    return SVGMap;

  })();

  svgmap.SVGMap = SVGMap;

  MapLayer = (function() {

    function MapLayer(layer_id, path_id, paper, view) {
      var me;
      me = this;
      me.id = layer_id;
      me.path_id = path_id;
      me.paper = paper;
      me.view = view;
    }

    MapLayer.prototype.addPath = function(svg_path) {
      var layerPath, me, _base, _name, _ref2, _ref3, _ref4;
      me = this;
      if ((_ref2 = me.paths) == null) me.paths = [];
      layerPath = new MapLayerPath(svg_path, me.id, me.paper, me.view);
      me.paths.push(layerPath);
      if (me.path_id != null) {
        if ((_ref3 = me.pathsById) == null) me.pathsById = {};
        if ((_ref4 = (_base = me.pathsById)[_name = layerPath.data[me.path_id]]) == null) {
          _base[_name] = [];
        }
        return me.pathsById[layerPath.data[me.path_id]].push(layerPath);
      }
    };

    return MapLayer;

  })();

  MapLayerPath = (function() {

    function MapLayerPath(svg_path, layer_id, paper, view) {
      var attr, data, i, me, path, path_str, _ref2;
      me = this;
      path_str = svg_path.getAttribute('d');
      me.path = path = svgmap.geom.Path.fromSVG(path_str);
      me.svgPath = paper.path(view.projectPath(path).toSVG());
      me.svgPath.node.setAttribute('class', 'polygon ' + layer_id);
      me.svgPath.node.path = me;
      data = {};
      for (i = 0, _ref2 = svg_path.attributes.length - 1; 0 <= _ref2 ? i <= _ref2 : i >= _ref2; 0 <= _ref2 ? i++ : i--) {
        attr = svg_path.attributes[i];
        if (attr.name.substr(0, 5) === "data-") {
          data[attr.name.substr(5)] = attr.value;
        }
      }
      me.data = data;
    }

    return MapLayerPath;

  })();

}).call(this);
