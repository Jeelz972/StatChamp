// live-main.js -- Entry point Vite pour live.html
// Les modules extraits du monolithe sont importes ici.
// Le code inline dans live.html est progressivement migre vers ces modules.

// LIVE TRACKER — migration Supabase gouvernée par un flag runtime (chantier 6.B).
import './src/engine/stats';
import { DB } from './src/db/firebase';
import { DB as SupabaseDB } from './src/db/supabase';
import { supabase as _supabaseClient } from './src/stores/auth-store';
import { createLiveDB } from './src/live/live-db';
import { deriveRole } from './src/auth/utils';
import { State, SWIPE_CONFIG } from './src/live/state';
import { computePace } from './src/live/pace-calculator';

// Phase 4.2 : modules utilitaires
import { createContextManager } from './src/live/context-manager';
import { createOfflineManager } from './src/live/offline-manager';
import { createTimelineFloat } from './src/live/timeline-float';

// Phase 4.3 : modules visuels
import { createQuickStats } from './src/live/quick-stats';
import { createWormChart } from './src/live/worm-chart';
import { createStatsModal } from './src/live/stats-modal';
import { createCoachReport } from './src/live/coach-report';

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
import { createMigrationManager } from './src/live/migration-manager';

// C8 — Bootstrap complet à l'intérieur de l'IIFE async pour garantir que
// l'auth guard se résout AVANT toute initialisation DB / écoute / branchement.
// Sans session coach/root, on redirige vers index.html (mode public lecture seule).
// La RLS bloque déjà toute écriture côté DB ; cette redirection est un guard UX.
window._liveReady = (async () => {
  console.log('[Live][debug] IIFE start');
  try {
    const { data } = await _supabaseClient.auth.getSession();
    console.log('[Live][debug] session:', data?.session);
    console.log('[Live][debug] user:', data?.session?.user);
    console.log('[Live][debug] app_metadata:', data?.session?.user?.app_metadata);
    console.log('[Live][debug] user_metadata:', data?.session?.user?.user_metadata);
    const role = deriveRole(data?.session?.user ?? null);
    console.log('[Live][debug] derived role:', role);
    if (!data?.session || (role !== 'coach' && role !== 'root')) {
      console.warn('[Live][debug] redirect → /index.html (no session or role not coach/root)');
      window.location.replace('/index.html');
      return;
    }
  } catch (e) {
    console.error('[Live][debug] auth check threw:', e);
    window.location.replace('/index.html');
    return;
  }
  console.log('[Live][debug] auth OK, continuing boot');

  // B5 — Résolution de l'équipe : ?team= query param > localStorage
  const _teamParam = new URLSearchParams(window.location.search).get('team');
  if (_teamParam) {
    DB.setTeam(_teamParam);
  } else if (!DB.getTeamId()) {
    console.warn('[Live] Aucune équipe configurée — ajoutez ?team=<id> ou connectez-vous via l\'app principale.');
  }

  window.LiveDB = createLiveDB({
    SupabaseDB,
    firestore: () => window.firebase.firestore(),
  });
  window._computePace = computePace;

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
    createCoachReport,
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
    createMigrationManager,
  };

  console.log('[Live] Vite entry loaded');
})();
