import React, { useMemo } from 'react';

(function() {

    function AssistNetwork({ actions = [], players = [] }) {
        const network = useMemo(() => {
            const connections = {};
            actions.filter(a => a.type === 'SHOT' && a.made && a.astId).forEach(a => {
                const key = `${a.astId}-${a.pid}`;
                if (!connections[key]) connections[key] = { passerId: a.astId, shooterId: a.pid, count: 0, pts: 0 };
                connections[key].count++;
                connections[key].pts += (a.val || 2);
            });
            return Object.values(connections).sort((a, b) => b.count - a.count).slice(0, 10).map(c => {
                const passer = players.find(p => p.id === c.passerId);
                const shooter = players.find(p => p.id === c.shooterId);
                return { ...c, passerName: passer ? `#${passer.number} ${passer.name}` : `Joueur ${c.passerId}`, shooterName: shooter ? `#${shooter.number} ${shooter.name}` : `Joueur ${c.shooterId}` };
            });
        }, [actions, players]);

        if (!network.length) return React.createElement('div', { className: 'text-slate-500 text-sm text-center py-4' }, "Aucune passe décisive répertoriée.");

        return React.createElement('div', { className: 'bg-slate-900 border border-slate-700 rounded-lg overflow-hidden' },
            React.createElement('table', { className: 'w-full text-left text-xs text-slate-300' },
                React.createElement('thead', { className: 'bg-slate-800 text-slate-400 uppercase' },
                    React.createElement('tr', null,
                        React.createElement('th', { className: 'p-2' }, 'Passeur'),
                        React.createElement('th', { className: 'p-2' }, 'Tireur'),
                        React.createElement('th', { className: 'p-2 text-center' }, 'Ast'),
                        React.createElement('th', { className: 'p-2 text-center text-orange-400' }, 'Pts Générés')
                    )
                ),
                React.createElement('tbody', { className: 'divide-y divide-slate-800' },
                    network.map((n, i) => React.createElement('tr', { key: i, className: 'hover:bg-slate-800/50' },
                        React.createElement('td', { className: 'p-2 font-bold text-white' }, n.passerName),
                        React.createElement('td', { className: 'p-2' }, n.shooterName),
                        React.createElement('td', { className: 'p-2 text-center font-bold text-blue-400' }, n.count),
                        React.createElement('td', { className: 'p-2 text-center text-orange-400' }, n.pts)
                    ))
                )
            )
        );
    }
    window.AssistNetwork = AssistNetwork;
})();