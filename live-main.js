// live-main.js -- Entry point Vite pour live.html
// Les modules extraits du monolithe sont importes ici.
// Le code inline dans live.html est progressivement migre vers ces modules.

import { DB } from './src/db/firebase';  // DB layer (remplace public/db-layer.js)

// B5 — Résolution de l'équipe : ?team= query param > localStorage
const _teamParam = new URLSearchParams(window.location.search).get('team');
if (_teamParam) {
  DB.setTeam(_teamParam);
} else if (!DB.getTeamId()) {
  console.warn('[Live] Aucune équipe configurée — ajoutez ?team=<id> ou connectez-vous via l\'app principale.');
}
import { State, SWIPE_CONFIG } from './src/live/state';

// Phase 4.2 : modules utilitaires
import { createContextManager } from './src/live/context-manager';
import { createOfflineManager } from './src/live/offline-manager';
import { createTimelineFloat } from './src/live/timeline-float';

// Phase 4.3 : modules visuels
import { createQuickStats } from './src/live/quick-stats';
import { createWormChart } from './src/live/worm-chart';
import { createStatsModal } from './src/live/stats-modal';
import { createMatchReport } from './src/live/match-report';

// Phase 4.4 : modules interactifs
import { createFoulPanel } from './src/live/foul-panel';
import { createSubsModal } from './src/live/subs-modal';
import { createStartersModal } from './src/live/starters-modal';
import { createCourtFirst } from './src/live/court-first';
import { createPlaySelector } from './src/live/play-selector';
import { createTimeoutManager } from './src/live/timeout-manager';
import { createReboundBanner } from './src/live/rebound-banner';
import { createKeyboardShortcuts } from './src/live/keyboard-shortcuts';

// Phase 4.5 : modules moteur
import { createAssistPopup } from './src/live/assist-popup';
import { createRunDetector } from './src/live/run-detector';
import { createLineupTracker } from './src/live/lineup-tracker';
import { createCourt } from './src/live/court';
import { createUI } from './src/live/ui';
import { createGameEngine } from './src/live/game-engine';
import { createSetupManager } from './src/live/setup-manager';

// Expose les factories sur window pour que le script inline les utilise.
// Note : les module scripts sont differés -- window._liveFactories sera
// disponible apres le chargement complet, pas pendant l'execution du script inline.
// Les factories sont utilisees via window._live (registre mis en place en fin de script inline).
window._liveFactories = {
  createContextManager,
  createOfflineManager,
  createTimelineFloat,
  createQuickStats,
  createWormChart,
  createStatsModal,
  createMatchReport,
  createFoulPanel,
  createSubsModal,
  createStartersModal,
  createCourtFirst,
  createPlaySelector,
  createTimeoutManager,
  createReboundBanner,
  createKeyboardShortcuts,
  createAssistPopup,
  createRunDetector,
  createLineupTracker,
  createCourt,
  createUI,
  createGameEngine,
  createSetupManager,
};

console.log('[Live] Vite entry loaded');
