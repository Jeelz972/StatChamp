(function () {
  'use strict';
  var useState = React.useState;
  var useMemo = React.useMemo;

  // ── FIBA half-court constants (meters) ──
  var BASKET_X = 7.5;
  var BASKET_Y = 1.575;
  var THREE_R = 6.75;
  var FT_R = 1.8;
  var RESTR_R = 1.25;
  var RING_R = 0.225;
  var BB_W = 1.8;
  var PAINT_W = 4.9;
  var PAINT_H = 5.8;
  var CORNER_X = 0.9;

  // ── Zone classification (game coords: nx=depth 0-14, ny=sideline 0-15) ──
  function distFromBasket(nx, ny) {
    return Math.sqrt((nx - 1.575) * (nx - 1.575) + (ny - 7.5) * (ny - 7.5));
  }

  function classifyZone(nx, ny) {
    var d = distFromBasket(nx, ny);
    if (nx < 5.8 && ny > 5.05 && ny < 9.95) return 'paint';
    if (d <= 6.75) {
      if (nx < 5.8 && ny <= 5.05) return 'mid_base_r';
      if (nx < 5.8 && ny >= 9.95) return 'mid_base_l';
      if (ny > 7.5) return 'mid_l';
      return 'mid_r';
    }
    if (ny <= 0.9) return 'corner_r';
    if (ny >= 14.1) return 'corner_l';
    if (ny > 7.5) return 'wing_l';
    return 'wing_r';
  }

  // Zone display metadata: label + position (% of rotated court container)
  // Rotated court: SVG_x = ny (0→15), SVG_y = nx (0→14), basket at top
  var ZONE_META = {
    paint: { label: 'Raquette', cx: 50, cy: 18 },
    mid_base_r: { label: 'Base D', cx: 20, cy: 14 },
    mid_base_l: { label: 'Base G', cx: 80, cy: 14 },
    mid_r: { label: 'Coude D', cx: 28, cy: 42 },
    mid_l: { label: 'Coude G', cx: 72, cy: 42 },
    corner_r: { label: 'Coin 3P D', cx: 3, cy: 6 },
    corner_l: { label: 'Coin 3P G', cx: 97, cy: 6 },
    wing_r: { label: 'Aile 3P D', cx: 14, cy: 55 },
    wing_l: { label: 'Aile 3P G', cx: 86, cy: 55 },
  };

  var ZONE_IDS = Object.keys(ZONE_META);

  // ── Court SVG elements (rotated: viewBox 0 0 15 14, basket at top) ──
  function courtSVG(opacity) {
    var sw = '0.08';
    var swThin = '0.05';
    var paintX = BASKET_X - PAINT_W / 2;
    var dx = CORNER_X - BASKET_X;
    var cornerY = BASKET_Y + Math.sqrt(THREE_R * THREE_R - dx * dx);
    var rightCX = 15 - CORNER_X;
    var ftLeft = BASKET_X - FT_R;
    var ftRight = BASKET_X + FT_R;
    var raLeft = BASKET_X - RESTR_R;
    var raRight = BASKET_X + RESTR_R;
    var bbY = BASKET_Y - 0.15;
    var bbLeft = BASKET_X - BB_W / 2;
    var bbRight = BASKET_X + BB_W / 2;

    return React.createElement(
      'svg',
      {
        viewBox: '0 0 15 14',
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        preserveAspectRatio: 'none',
        style: { opacity: opacity || 0.3 },
      },
      React.createElement('rect', {
        key: 'b',
        x: 0,
        y: 0,
        width: 15,
        height: 14,
        fill: 'none',
        stroke: '#fff',
        strokeWidth: sw,
      }),
      React.createElement('rect', {
        key: 'p',
        x: paintX,
        y: 0,
        width: PAINT_W,
        height: PAINT_H,
        fill: 'none',
        stroke: '#fff',
        strokeWidth: sw,
      }),
      React.createElement('path', {
        key: 'fs',
        d:
          'M ' +
          ftLeft +
          ',' +
          PAINT_H +
          ' A ' +
          FT_R +
          ',' +
          FT_R +
          ' 0 0,0 ' +
          ftRight +
          ',' +
          PAINT_H,
        fill: 'none',
        stroke: '#fff',
        strokeWidth: sw,
      }),
      React.createElement('path', {
        key: 'fd',
        d:
          'M ' +
          ftLeft +
          ',' +
          PAINT_H +
          ' A ' +
          FT_R +
          ',' +
          FT_R +
          ' 0 0,1 ' +
          ftRight +
          ',' +
          PAINT_H,
        fill: 'none',
        stroke: '#fff',
        strokeWidth: swThin,
        strokeDasharray: '0.3,0.3',
      }),
      React.createElement('line', {
        key: 'cl',
        x1: CORNER_X,
        y1: 0,
        x2: CORNER_X,
        y2: cornerY,
        stroke: '#fff',
        strokeWidth: sw,
      }),
      React.createElement('line', {
        key: 'cr',
        x1: rightCX,
        y1: 0,
        x2: rightCX,
        y2: cornerY,
        stroke: '#fff',
        strokeWidth: sw,
      }),
      React.createElement('path', {
        key: '3a',
        d:
          'M ' +
          CORNER_X +
          ',' +
          cornerY +
          ' A ' +
          THREE_R +
          ',' +
          THREE_R +
          ' 0 0,0 ' +
          rightCX +
          ',' +
          cornerY,
        fill: 'none',
        stroke: '#fff',
        strokeWidth: sw,
      }),
      React.createElement('path', {
        key: 'ra',
        d:
          'M ' +
          raLeft +
          ',' +
          BASKET_Y +
          ' A ' +
          RESTR_R +
          ',' +
          RESTR_R +
          ' 0 0,0 ' +
          raRight +
          ',' +
          BASKET_Y,
        fill: 'none',
        stroke: '#fff',
        strokeWidth: swThin,
      }),
      React.createElement('line', {
        key: 'bb',
        x1: bbLeft,
        y1: bbY,
        x2: bbRight,
        y2: bbY,
        stroke: '#fff',
        strokeWidth: '0.12',
      }),
      React.createElement('circle', {
        key: 'ri',
        cx: BASKET_X,
        cy: BASKET_Y,
        r: RING_R,
        fill: 'none',
        stroke: '#f97316',
        strokeWidth: '0.1',
      }),
      React.createElement('path', {
        key: 'cc',
        d: 'M ' + (BASKET_X - 1.8) + ',14 A 1.8,1.8 0 0,1 ' + (BASKET_X + 1.8) + ',14',
        fill: 'none',
        stroke: '#fff',
        strokeWidth: sw,
      })
    );
  }

  // ── Color by shooting % ──
  function zoneColor(made, total) {
    var pct = made / total;
    if (pct >= 0.5) return { bg: 'rgba(34,197,94,0.75)', text: '#fff' };
    if (pct >= 0.35) return { bg: 'rgba(234,179,8,0.8)', text: '#fff' };
    return { bg: 'rgba(239,68,68,0.75)', text: '#fff' };
  }

  // ── Component ──
  function ShotChart(props) {
    var shots = props.shots || [];
    var playerName = props.playerName || 'Joueur';

    var modeState = useState('scatter');
    var mode = modeState[0];
    var setMode = modeState[1];

    var validShots = useMemo(
      function () {
        return shots
          .filter(function (s) {
            return s.x !== undefined && s.y !== undefined;
          })
          .map(function (s) {
            var nx = s.x,
              ny = s.y;
            if (nx > 14) {
              nx = 28 - nx;
              ny = 15 - ny;
            }
            return { x: s.x, y: s.y, nx: nx, ny: ny, made: s.made, val: s.val, q: s.q };
          });
      },
      [shots]
    );

    var zoneData = useMemo(
      function () {
        var data = {};
        ZONE_IDS.forEach(function (id) {
          data[id] = { made: 0, total: 0 };
        });
        validShots.forEach(function (s) {
          var zid = classifyZone(s.nx, s.ny);
          if (data[zid]) {
            data[zid].total++;
            if (s.made) data[zid].made++;
          }
        });
        return data;
      },
      [validShots]
    );

    var totalMade = validShots.filter(function (s) {
      return s.made;
    }).length;

    return React.createElement(
      'div',
      { className: 'bg-slate-900 border border-slate-700 rounded-lg p-4' },
      // Header
      React.createElement(
        'div',
        { className: 'flex justify-between items-center mb-4' },
        React.createElement(
          'div',
          null,
          React.createElement(
            'h4',
            { className: 'text-sm font-bold text-orange-400' },
            'Shot Chart - ' + playerName
          ),
          React.createElement(
            'span',
            { className: 'text-xs text-slate-400' },
            totalMade +
              '/' +
              validShots.length +
              ' (' +
              (validShots.length > 0 ? Math.round((totalMade / validShots.length) * 100) : 0) +
              '%)'
          )
        ),
        React.createElement(
          'div',
          { className: 'flex gap-2 bg-slate-800 p-1 rounded' },
          React.createElement(
            'button',
            {
              className:
                'px-3 py-1 text-xs rounded font-bold ' +
                (mode === 'scatter' ? 'bg-orange-500 text-white' : 'text-slate-400'),
              onClick: function () {
                setMode('scatter');
              },
            },
            'Scatter'
          ),
          React.createElement(
            'button',
            {
              className:
                'px-3 py-1 text-xs rounded font-bold ' +
                (mode === 'heatmap' ? 'bg-orange-500 text-white' : 'text-slate-400'),
              onClick: function () {
                setMode('heatmap');
              },
            },
            'Zones'
          )
        )
      ),
      // Court container
      React.createElement(
        'div',
        {
          className:
            'relative w-full bg-slate-950 border-2 border-slate-600 overflow-hidden rounded',
          style: { paddingBottom: '93.33%' },
        },
        React.createElement(
          'div',
          { className: 'absolute inset-0' },
          courtSVG(mode === 'heatmap' ? 0.45 : 0.3),
          mode === 'scatter'
            ? // ── Scatter: dots ──
              validShots.map(function (s, i) {
                return React.createElement('div', {
                  key: i,
                  className:
                    'absolute rounded-full border border-white shadow-lg ' +
                    (s.made ? 'bg-green-500' : 'bg-red-500 opacity-60'),
                  style: {
                    left: (s.ny / 15) * 100 + '%',
                    top: (s.nx / 14) * 100 + '%',
                    width: '12px',
                    height: '12px',
                    marginLeft: '-6px',
                    marginTop: '-6px',
                  },
                  title: 'Q' + (s.q || 1) + ' - ' + s.val + 'pts',
                });
              })
            : // ── Heatmap: zone badges on court ──
              ZONE_IDS.map(function (id) {
                var zd = zoneData[id];
                if (!zd || zd.total === 0) return null;
                var meta = ZONE_META[id];
                var pct = Math.round((zd.made / zd.total) * 100);
                var col = zoneColor(zd.made, zd.total);
                var isCorner = id.indexOf('corner') !== -1;
                return React.createElement(
                  'div',
                  {
                    key: id,
                    className:
                      'absolute flex flex-col items-center justify-center rounded-lg shadow-lg',
                    style: {
                      left: meta.cx + '%',
                      top: meta.cy + '%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: col.bg,
                      color: col.text,
                      padding: isCorner ? '3px 5px' : '4px 8px',
                      minWidth: isCorner ? '36px' : '48px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(2px)',
                      zIndex: 10,
                    },
                  },
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        opacity: 0.9,
                      },
                    },
                    meta.label
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        lineHeight: 1.2,
                        textAlign: 'center',
                      },
                    },
                    pct + '%'
                  ),
                  React.createElement(
                    'div',
                    {
                      style: {
                        fontSize: '0.55rem',
                        fontWeight: 600,
                        lineHeight: 1.1,
                        textAlign: 'center',
                        opacity: 0.85,
                      },
                    },
                    zd.made + '/' + zd.total
                  )
                );
              })
        )
      ),
      // Legend
      React.createElement(
        'div',
        { className: 'flex justify-center gap-4 mt-3 text-xs text-slate-400' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-1' },
          React.createElement('div', {
            className: 'w-3 h-3 rounded-full bg-green-500 border border-white',
          }),
          mode === 'heatmap' ? '> 50%' : 'Reussi'
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-1' },
          React.createElement('div', {
            className: 'w-3 h-3 rounded-full bg-yellow-500 border border-white',
          }),
          mode === 'heatmap' ? '35-50%' : ''
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-1' },
          React.createElement('div', {
            className: 'w-3 h-3 rounded-full bg-red-500 border border-white',
          }),
          mode === 'heatmap' ? '< 35%' : 'Rate'
        )
      )
    );
  }

  window.ShotChart = ShotChart;
})();
