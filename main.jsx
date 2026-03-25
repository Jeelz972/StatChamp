// main.jsx -- Point d'entree Vite pour index.html
// Remplace le systeme loadJS + Babel standalone

// SHIM EN PREMIER : expose window.React avant tout autre import
import './react-shim.js';

// CSS
import './design-tokens.css';
import './app.css';

// Modules metier (ordre identique a l'ancien loadJS)
import './src/engine/stats';
import { normalizeSub } from './src/utils/normalize-sub';
window.normalizeSub = normalizeSub;
import './PlayByPlayEditor.jsx';
import './ShotChart.js';
import './AssistNetwork.jsx';
import './nba-profiles.js';
import './ReportPlayer.jsx';
import './RotationChart.jsx';
import './StatComponents.jsx';
import './GlobalStats.jsx';
import './SeasonDashboard.jsx';
import './OpponentScouting.jsx';
import './GamePrep.jsx';
import './src/db/firebase';
import './app.jsx';
