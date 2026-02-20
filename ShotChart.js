(function() {
    "use strict";
    const { useState, useMemo } = React;

    const ZONES = [
        { id: 'paint', label: 'Raquette', check: (x, y) => x < 5.8 && y > 5.05 && y < 9.95 },
        { id: 'mid_left', label: 'Mi-dist G', check: (x, y) => x >= 5.8 && x <= 14 && y > 7.5 && Math.sqrt(Math.pow(x - 1.575, 2) + Math.pow(y - 7.5, 2)) <= 6.75 },
        { id: 'mid_right', label: 'Mi-dist D', check: (x, y) => x >= 5.8 && x <= 14 && y <= 7.5 && Math.sqrt(Math.pow(x - 1.575, 2) + Math.pow(y - 7.5, 2)) <= 6.75 },
        { id: '3pt_corner_l', label: '3pts Coin G', check: (x, y) => x <= 2.9 && y >= 14.1 },
        { id: '3pt_corner_r', label: '3pts Coin D', check: (x, y) => x <= 2.9 && y <= 0.9 },
        { id: '3pt_wing_l', label: '3pts Aile G', check: (x, y) => x > 2.9 && x <= 14 && y > 7.5 && Math.sqrt(Math.pow(x - 1.575, 2) + Math.pow(y - 7.5, 2)) > 6.75 },
        { id: '3pt_wing_r', label: '3pts Aile D', check: (x, y) => x > 2.9 && x <= 14 && y <= 7.5 && Math.sqrt(Math.pow(x - 1.575, 2) + Math.pow(y - 7.5, 2)) > 6.75 }
    ];

    function ShotChart({ shots = [], playerName = "Joueur" }) {
        const [mode, setMode] = useState('scatter');
        
        const validShots = useMemo(() => {
            // Normalisation des tirs sur le demi-terrain gauche (x <= 14)
            return shots.filter(s => s.x !== undefined && s.y !== undefined).map(s => {
                let nx = s.x, ny = s.y;
                if (nx > 14) { nx = 28 - nx; ny = 15 - ny; }
                return { ...s, nx, ny };
            });
        }, [shots]);

        const heatmapData = useMemo(() => {
            const data = {};
            ZONES.forEach(z => data[z.id] = { label: z.label, made: 0, total: 0 });
            validShots.forEach(s => {
                const zone = ZONES.find(z => z.check(s.nx, s.ny));
                if (zone) {
                    data[zone.id].total++;
                    if (s.made) data[zone.id].made++;
                }
            });
            return Object.values(data).filter(d => d.total > 0);
        }, [validShots]);

        const getColor = (made, total) => {
            const pct = made / total;
            if (pct >= 0.5) return 'rgba(34, 197, 94, 0.7)';
            if (pct >= 0.35) return 'rgba(234, 179, 8, 0.7)';
            return 'rgba(239, 68, 68, 0.7)';
        };

        return React.createElement('div', { className: 'bg-slate-900 border border-slate-700 rounded-lg p-4' },
            React.createElement('div', { className: 'flex justify-between items-center mb-4' },
                React.createElement('h4', { className: 'text-sm font-bold text-orange-400' }, `Shot Chart - ${playerName} (${validShots.length} tirs)`),
                React.createElement('div', { className: 'flex gap-2 bg-slate-800 p-1 rounded' },
                    React.createElement('button', { className: `px-3 py-1 text-xs rounded font-bold ${mode === 'scatter' ? 'bg-orange-500 text-white' : 'text-slate-400'}`, onClick: () => setMode('scatter') }, 'Scatter'),
                    React.createElement('button', { className: `px-3 py-1 text-xs rounded font-bold ${mode === 'heatmap' ? 'bg-orange-500 text-white' : 'text-slate-400'}`, onClick: () => setMode('heatmap') }, 'Zones')
                )
            ),
            React.createElement('div', { className: 'relative w-full aspect-[28/15] bg-slate-950 border-2 border-slate-600 overflow-hidden' },
                // Tracé terrain simplifié
                React.createElement('svg', { viewBox: '0 0 14 15', className: 'absolute inset-0 w-full h-full opacity-30 pointer-events-none' },
                    React.createElement('rect', { x: 0, y: 5.05, width: 5.8, height: 4.9, fill: 'none', stroke: 'white', strokeWidth: 0.1 }),
                    React.createElement('path', { d: 'M0,0.9 L2.9,0.9 A6.75,6.75 0 0,0 2.9,14.1 L0,14.1', fill: 'none', stroke: 'white', strokeWidth: 0.1 }),
                    React.createElement('circle', { cx: 1.575, cy: 7.5, r: 0.225, fill: 'none', stroke: 'orange', strokeWidth: 0.1 })
                ),
                mode === 'scatter' ? 
                    validShots.map((s, i) => React.createElement('div', {
                        key: i,
                        className: `absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border border-white shadow-lg ${s.made ? 'bg-green-500' : 'bg-red-500 opacity-60'}`,
                        style: { left: `${(s.nx / 14) * 100}%`, top: `${(s.ny / 15) * 100}%` },
                        title: `Q${s.q || 1} - ${s.val}pts`
                    }))
                :
                    React.createElement('div', { className: 'grid grid-cols-2 gap-2 p-2' },
                        heatmapData.map((z, i) => React.createElement('div', { key: i, className: 'flex justify-between p-2 rounded text-xs font-bold text-white', style: { backgroundColor: getColor(z.made, z.total) } },
                            React.createElement('span', null, z.label),
                            React.createElement('span', null, `${z.made}/${z.total} (${Math.round((z.made/z.total)*100)}%)`)
                        ))
                    )
            )
        );
    }
    window.ShotChart = ShotChart;
})();