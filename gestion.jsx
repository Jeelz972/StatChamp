import { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx'; // Assure-toi d'avoir cette librairie installée si ce n'est pas déjà le cas

const PRELOADED_DATA = [
  {
    nom: 'ADEGOKE',
    prenom: 'Wendy',
    dateNaissance: '2011-10-09',
    categorie: 'U15',
    licence: 'BC117311',
    taille: 170,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'AOUTA',
    prenom: 'Ayline',
    dateNaissance: '2016-07-11',
    categorie: 'U10',
    licence: 'BC168606',
    taille: 135,
    typeLicence: '2C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'APRILE',
    prenom: 'Gisele',
    dateNaissance: '1963-05-29',
    categorie: 'S',
    licence: 'VT630014',
    taille: 163,
    typeLicence: '0',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'ARTAUX',
    prenom: 'Julie',
    dateNaissance: '1988-08-27',
    categorie: 'S',
    licence: 'JH882435',
    taille: 162,
    typeLicence: '0',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BARUFFALDI',
    prenom: 'Eva',
    dateNaissance: '2016-03-30',
    categorie: 'U10',
    licence: 'BC168772',
    taille: 125,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BEN SASSI',
    prenom: 'Hanna',
    dateNaissance: '2015-06-04',
    categorie: 'U11',
    licence: 'BC156692',
    taille: 150,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BENLAREDJ',
    prenom: 'Nesrine',
    dateNaissance: '2010-06-04',
    categorie: 'U16',
    licence: 'BC105719',
    taille: 168,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BOTTAGISI',
    prenom: 'Tiana',
    dateNaissance: '2015-06-06',
    categorie: 'U11',
    licence: 'BC151482',
    taille: 145,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BOURE',
    prenom: 'Myla',
    dateNaissance: '2017-03-01',
    categorie: 'U9',
    licence: 'BC175007',
    taille: 127,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BOURÉ',
    prenom: 'Louna',
    dateNaissance: '2013-07-08',
    categorie: 'U13',
    licence: 'BC134357',
    taille: 158,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BRANDAO',
    prenom: 'Isabelle',
    dateNaissance: '1979-08-07',
    categorie: 'S',
    licence: 'VT798595',
    taille: 163,
    typeLicence: '0',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BRANDAO',
    prenom: 'Jade',
    dateNaissance: '2014-07-16',
    categorie: 'U12',
    licence: 'BC142542',
    taille: 150,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BRENIERE',
    prenom: 'Mila',
    dateNaissance: '2016-06-29',
    categorie: 'U10',
    licence: 'BC163692',
    taille: 135,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'BRIMSHAM',
    prenom: 'Siësa',
    dateNaissance: '2010-01-07',
    categorie: 'U16',
    licence: 'BC104325',
    taille: 170,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'CARRINHO',
    prenom: 'Louise',
    dateNaissance: '2018-02-20',
    categorie: 'U8',
    licence: 'BC186686',
    taille: 127,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'CARTEL',
    prenom: 'Annick',
    dateNaissance: '1953-05-26',
    categorie: 'S',
    licence: 'VT530084',
    taille: 170,
    typeLicence: '0',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'CHAILI',
    prenom: 'Nessayem',
    dateNaissance: '2015-07-02',
    categorie: 'U11',
    licence: 'BC150337',
    taille: 145,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'CHARLIER',
    prenom: 'Clara',
    dateNaissance: '2012-07-26',
    categorie: 'U14',
    licence: 'BC125384',
    taille: 155,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'COINTRE',
    prenom: 'Keyssie',
    dateNaissance: '2012-07-03',
    categorie: 'U14',
    licence: 'BC127864',
    taille: 154,
    typeLicence: '2C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'COMARLOT',
    prenom: 'Inès',
    dateNaissance: '2012-06-02',
    categorie: 'U14',
    licence: 'BC122966',
    taille: 165,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'DA SILVA GOMES',
    prenom: 'Bela',
    dateNaissance: '2014-08-29',
    categorie: 'U12',
    licence: 'BC149313',
    taille: 150,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'DALIGAULT',
    prenom: 'Oriel',
    dateNaissance: '2016-08-20',
    categorie: 'U10',
    licence: 'BC161897',
    taille: 134,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'DE JESUS MANCO',
    prenom: 'Liana',
    dateNaissance: '2016-03-09',
    categorie: 'U10',
    licence: 'BC163233',
    taille: 142,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'DECARREAUX',
    prenom: 'Ambre',
    dateNaissance: '2013-02-11',
    categorie: 'U13',
    licence: 'BC136499',
    taille: 170,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'DIAKITE',
    prenom: 'Maïmouna',
    dateNaissance: '2019-11-14',
    categorie: 'U7',
    licence: 'BC196052',
    taille: null,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'DIONGUE',
    prenom: 'Marieme',
    dateNaissance: '2017-01-31',
    categorie: 'U9',
    licence: 'BC179083',
    taille: 135,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'ELISABETH-DORVILMA',
    prenom: 'Mélissa',
    dateNaissance: '2010-05-03',
    categorie: 'U16',
    licence: 'BC101986',
    taille: 170,
    typeLicence: '2C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'ELISABETH-DORVILMA',
    prenom: 'Maélie',
    dateNaissance: '2012-03-04',
    categorie: 'U14',
    licence: 'BC127017',
    taille: 168,
    typeLicence: '2C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'FENOT',
    prenom: 'Léna',
    dateNaissance: '2014-06-22',
    categorie: 'U12',
    licence: 'BC147219',
    taille: 148,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
  {
    nom: 'GAMBI',
    prenom: 'Maholy',
    dateNaissance: '2015-09-07',
    categorie: 'U11',
    licence: 'BC151815',
    taille: 170,
    typeLicence: '0C',
    club: 'ESPE BASKET CHALONS EN CHAMPAGNE',
    sexe: 'F',
    source: 'ESPE',
  },
];

// Configuration des catégories principales d'équipes
const TEAM_CONFIGS = {
  U11: {
    label: 'U11',
    desc: 'Mini-Basket',
    eligibleCategories: ['U9', 'U10', 'U11'],
    minRoster: 8,
    maxRoster: 10,
    color: '#06b6d4',
    birthYears: '2015-2017',
  },
  U13: {
    label: 'U13',
    desc: 'Poussin(e)s',
    eligibleCategories: ['U11', 'U12', 'U13'],
    minRoster: 8,
    maxRoster: 12,
    color: '#8b5cf6',
    birthYears: '2013-2015',
  },
  U15: {
    label: 'U15',
    desc: 'Benjamin(e)s',
    eligibleCategories: ['U13', 'U14', 'U15'],
    minRoster: 8,
    maxRoster: 12,
    color: '#f59e0b',
    birthYears: '2011-2013',
  },
  U18: {
    label: 'U18',
    desc: 'Cadet(te)s / Minimes',
    eligibleCategories: ['U15', 'U16', 'U17', 'U18'],
    minRoster: 8,
    maxRoster: 12,
    color: '#ef4444',
    birthYears: '2008-2011',
  },
};

const ALL_CATEGORIES = [
  'U7',
  'U8',
  'U9',
  'U10',
  'U11',
  'U12',
  'U13',
  'U14',
  'U15',
  'U16',
  'U17',
  'U18',
  'U20',
  'U21',
  'S',
];

const KNOWN_HEADER_FIELDS = {
  nom: ['Nom'],
  prenom: ['Prénom', 'Prenom'],
  dateNaissance: ['D.Naissance', 'Date de naissance', 'Date Naissance'],
  categorie: ['Catgéorie', 'Catégorie', 'Categorie', 'Cat'],
  licence: ['N°Licence', 'Licence', 'N° Licence'],
  taille: ['Taille'],
  typeLicence: ['T.Licence', 'Type Licence'],
  club: ['Club'],
  sexe: ['Sexe'],
};

function parseXlsx(data) {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    if (
      rows[i] &&
      rows[i].some(
        (c) => typeof c === 'string' && (c === 'Nom' || c === 'Prénom' || c === 'N°Licence')
      )
    ) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map((h) => (h || '').toString().trim());
  const fieldMap = {};
  for (const [field, aliases] of Object.entries(KNOWN_HEADER_FIELDS)) {
    const idx = headers.findIndex((h) => aliases.some((a) => h.toLowerCase() === a.toLowerCase()));
    if (idx !== -1) fieldMap[field] = idx;
  }

  const players = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const nom = fieldMap.nom !== undefined ? row[fieldMap.nom] : null;
    if (!nom || typeof nom !== 'string' || nom.trim() === '') continue;

    let dobStr = null;
    let dob = fieldMap.dateNaissance !== undefined ? row[fieldMap.dateNaissance] : null;
    if (dob instanceof Date) dobStr = dob.toISOString().split('T')[0];
    else if (typeof dob === 'string' && dob.match(/\d{4}-\d{2}-\d{2}/)) dobStr = dob;

    players.push({
      nom: nom.toString().trim(),
      prenom:
        fieldMap.prenom !== undefined && row[fieldMap.prenom]
          ? row[fieldMap.prenom].toString().trim()
          : '',
      dateNaissance: dobStr,
      categorie:
        fieldMap.categorie !== undefined && row[fieldMap.categorie]
          ? row[fieldMap.categorie].toString().trim()
          : '',
      licence:
        fieldMap.licence !== undefined && row[fieldMap.licence]
          ? row[fieldMap.licence].toString().trim()
          : '',
      taille: typeof row[fieldMap.taille] === 'number' ? row[fieldMap.taille] : null,
      typeLicence:
        fieldMap.typeLicence !== undefined && row[fieldMap.typeLicence]
          ? row[fieldMap.typeLicence].toString().trim()
          : '',
      club:
        fieldMap.club !== undefined && row[fieldMap.club]
          ? row[fieldMap.club].toString().trim()
          : '',
      sexe:
        fieldMap.sexe !== undefined && row[fieldMap.sexe]
          ? row[fieldMap.sexe].toString().trim()
          : '',
      source: 'Import',
    });
  }
  return players;
}

function getBirthYear(dob) {
  return dob ? new Date(dob).getFullYear() : null;
}

function Badge({ children, color, small }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: small ? '1px 6px' : '2px 10px',
        borderRadius: 999,
        fontSize: small ? 10 : 11,
        fontWeight: 700,
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        letterSpacing: '0.02em',
        lineHeight: 1.6,
      }}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: 14,
        padding: '18px 20px',
        border: '1px solid var(--border)',
        flex: '1 1 140px',
        minWidth: 140,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 28, opacity: 0.15 }}>
        {icon}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: color || 'var(--text)',
          marginTop: 4,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function App() {
  const [players, setPlayers] = useState(PRELOADED_DATA);
  const [activeTab, setActiveTab] = useState('liste');
  const [catFilter, setCatFilter] = useState('ALL');
  const [clubFilter, setClubFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('U13');
  const [selectedSubTeam, setSelectedSubTeam] = useState('Équipe 1');
  const [importing, setImporting] = useState(false);

  // Structure des équipes : { U13: { "Équipe 1": ["licence1", ...], "Équipe 2": [] } }
  const [teamRosters, setTeamRosters] = useState({
    U11: { 'Équipe 1': [] },
    U13: { 'Équipe 1': [] },
    U15: { 'Équipe 1': [] },
    U18: { 'Équipe 1': [] },
  });

  // Gérer le changement de catégorie pour re-sélectionner la première sous-équipe
  useEffect(() => {
    const subTeams = Object.keys(teamRosters[selectedTeam] || {});
    if (!subTeams.includes(selectedSubTeam)) {
      setSelectedSubTeam(subTeams[0] || 'Équipe 1');
    }
  }, [selectedTeam, teamRosters]);

  const clubs = useMemo(() => [...new Set(players.map((p) => p.source))].sort(), [players]);
  const categories = useMemo(() => {
    const cats = [...new Set(players.map((p) => p.categorie))].filter(Boolean);
    return ALL_CATEGORIES.filter((c) => cats.includes(c));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (catFilter !== 'ALL' && p.categorie !== catFilter) return false;
        if (clubFilter !== 'ALL' && p.source !== clubFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!`${p.nom} ${p.prenom} ${p.licence}`.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [players, catFilter, clubFilter, searchQuery]);

  // Toutes les joueuses déjà placées dans la catégorie sélectionnée (toutes sous-équipes confondues)
  const allRosteredInCurrentTeam = useMemo(() => {
    const currentCatTeams = teamRosters[selectedTeam] || {};
    return Object.values(currentCatTeams).flat();
  }, [teamRosters, selectedTeam]);

  // Joueuses éligibles (qui ne sont dans AUCUNE sous-équipe de cette catégorie)
  const eligiblePlayers = useMemo(() => {
    const config = TEAM_CONFIGS[selectedTeam];
    if (!config) return [];
    return players
      .filter((p) => config.eligibleCategories.includes(p.categorie))
      .filter((p) => !allRosteredInCurrentTeam.includes(p.licence))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }, [players, selectedTeam, allRosteredInCurrentTeam]);

  // Roster de la sous-équipe actuellement visualisée
  const currentRoster =
    (teamRosters[selectedTeam] && teamRosters[selectedTeam][selectedSubTeam]) || [];
  const rosterPlayers = useMemo(() => {
    return currentRoster.map((lic) => players.find((p) => p.licence === lic)).filter(Boolean);
  }, [currentRoster, players]);

  // Fonction pour faire vieillir tout le monde de 1 an
  const handleNextSeason = () => {
    if (
      !window.confirm(
        "Attention, cela va augmenter la catégorie de toutes les joueuses d'un an (ex: U11 devient U12). Les compositions d'équipes seront réinitialisées. Continuer ?"
      )
    )
      return;

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.categorie === 'S') return p;
        const match = p.categorie.match(/^U(\d+)$/);
        if (match) {
          const nextAge = parseInt(match[1], 10) + 1;
          return { ...p, categorie: nextAge >= 21 ? 'S' : `U${nextAge}` };
        }
        return p;
      })
    );

    // Reset rosters because categories changed
    setTeamRosters({
      U11: { 'Équipe 1': [] },
      U13: { 'Équipe 1': [] },
      U15: { 'Équipe 1': [] },
      U18: { 'Équipe 1': [] },
    });
  };

  const handleFileImport = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const newPlayers = parseXlsx(new Uint8Array(data));
      if (newPlayers.length === 0) alert('Aucune joueuse trouvée.');
      else {
        const sourceName = file.name
          .replace(/\.xlsx?$/i, '')
          .replace(/^Licences_fille_/, '')
          .toUpperCase();
        const withSource = newPlayers.map((p) => ({
          ...p,
          source: p.source === 'Import' ? sourceName : p.source,
        }));
        setPlayers((prev) => {
          const existingLicences = new Set(prev.map((p) => p.licence));
          return [...prev, ...withSource.filter((p) => !existingLicences.has(p.licence))];
        });
      }
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
    setImporting(false);
    e.target.value = '';
  }, []);

  const addSubTeam = () => {
    setTeamRosters((prev) => {
      const currentCatTeams = prev[selectedTeam] || {};
      const newIndex = Object.keys(currentCatTeams).length + 1;
      const newName = `Équipe ${newIndex}`;
      return {
        ...prev,
        [selectedTeam]: { ...currentCatTeams, [newName]: [] },
      };
    });
    setSelectedSubTeam(`Équipe ${Object.keys(teamRosters[selectedTeam] || {}).length + 1}`);
  };

  const addToRoster = (licence) => {
    const config = TEAM_CONFIGS[selectedTeam];
    if (currentRoster.length >= config.maxRoster) return;
    setTeamRosters((prev) => ({
      ...prev,
      [selectedTeam]: {
        ...prev[selectedTeam],
        [selectedSubTeam]: [...(prev[selectedTeam][selectedSubTeam] || []), licence],
      },
    }));
  };

  const removeFromRoster = (licence) => {
    setTeamRosters((prev) => ({
      ...prev,
      [selectedTeam]: {
        ...prev[selectedTeam],
        [selectedSubTeam]: prev[selectedTeam][selectedSubTeam].filter((l) => l !== licence),
      },
    }));
  };

  const catCounts = useMemo(() => {
    const counts = {};
    players.forEach((p) => {
      counts[p.categorie] = (counts[p.categorie] || 0) + 1;
    });
    return counts;
  }, [players]);

  const totalJeunes = players.filter((p) => p.categorie !== 'S').length;

  return (
    <div
      style={{
        '--bg': '#0a0e17',
        '--card-bg': '#111827',
        '--border': '#1e293b',
        '--text': '#e2e8f0',
        '--muted': '#64748b',
        '--accent': '#f59e0b',
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        padding: 0,
        margin: 0,
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      {/* Styles pour l'impression PDF */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { border: 1px solid #ccc !important; box-shadow: none !important; color: black !important; background: white !important; page-break-inside: avoid;}
          .print-text-dark { color: black !important; }
        }
      `}</style>

      {/* Header */}
      <div
        className="no-print"
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1a1f3a 100%)',
          borderBottom: '1px solid var(--border)',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#fff',
            }}
          >
            🏀
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>FFBB Licence Manager</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
              Gestion & Composition d'équipes
            </p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button
              onClick={handleNextSeason}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                background: '#1e293b',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid var(--border)',
              }}
            >
              ⏩ Passer Saison Suivante (+1 an)
            </button>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 10,
                background: importing ? '#1e293b' : 'linear-gradient(135deg, #f59e0b, #f97316)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {importing ? '⏳ Import...' : '📂 Importer .xlsx'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileImport}
                style={{ display: 'none' }}
                disabled={importing}
              />
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
          {[
            { id: 'liste', label: '📋 Licenciées', count: filteredPlayers.length },
            { id: 'equipes', label: '⚙️ Composition', count: null },
            { id: 'overview', label: "📊 Vue d'ensemble", count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === tab.id ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#f59e0b' : 'var(--muted)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #f59e0b' : '2px solid transparent',
              }}
            >
              {tab.label}{' '}
              {tab.count !== null && <span style={{ opacity: 0.6 }}>({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 1200, margin: '0 auto' }}>
        {/* ===== LISTE TAB ===== */}
        {activeTab === 'liste' && (
          <div className="no-print">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
              <input
                type="text"
                placeholder="🔍 Rechercher nom, prénom, licence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: '1 1 200px',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#111827',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              />
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#111827',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              >
                <option value="ALL">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c} ({catCounts[c] || 0})
                  </option>
                ))}
              </select>
            </div>
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#111827' }}>
                    {[
                      'Nom',
                      'Prénom',
                      'Catégorie',
                      'Naissance',
                      'Taille',
                      'Licence',
                      'Type',
                      'Club',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((p, i) => (
                    <tr key={p.licence || i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700 }}>{p.nom}</td>
                      <td style={{ padding: '8px 12px' }}>{p.prenom}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <Badge color={TEAM_CONFIGS[p.categorie]?.color || '#64748b'} small>
                          {p.categorie}
                        </Badge>
                      </td>
                      <td
                        style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                      >
                        {p.dateNaissance
                          ? new Date(p.dateNaissance).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                      <td
                        style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                      >
                        {p.taille ? `${p.taille} cm` : '—'}
                      </td>
                      <td
                        style={{
                          padding: '8px 12px',
                          fontFamily: 'JetBrains Mono',
                          fontSize: 11,
                          color: 'var(--muted)',
                        }}
                      >
                        {p.licence}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{p.typeLicence}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>
                        {p.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== EQUIPES TAB ===== */}
        {activeTab === 'equipes' && (
          <div className="no-print">
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {Object.entries(TEAM_CONFIGS).map(([key, cfg]) => {
                const rosteredCount = Object.values(teamRosters[key] || {}).flat().length;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTeam(key)}
                    style={{
                      flex: '1 1 120px',
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: selectedTeam === key ? `${cfg.color}18` : 'var(--card-bg)',
                      border:
                        selectedTeam === key ? `2px solid ${cfg.color}` : '1px solid var(--border)',
                      color: selectedTeam === key ? cfg.color : 'var(--text)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      {cfg.desc}
                    </div>
                    <div style={{ fontSize: 10, marginTop: 6, color: 'var(--text)' }}>
                      Placées : {rosteredCount}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-teams selector */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              {Object.keys(teamRosters[selectedTeam] || {}).map((subTeam) => (
                <button
                  key={subTeam}
                  onClick={() => setSelectedSubTeam(subTeam)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background:
                      selectedSubTeam === subTeam ? TEAM_CONFIGS[selectedTeam].color : '#1e293b',
                    color: selectedSubTeam === subTeam ? '#fff' : 'var(--text)',
                  }}
                >
                  {subTeam} ({teamRosters[selectedTeam][subTeam].length})
                </button>
              ))}
              <button
                onClick={addSubTeam}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  border: '1px dashed var(--muted)',
                  background: 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                }}
              >
                + Ajouter une équipe
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Eligible pool */}
              <div
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Joueuses sans équipe</span>
                  <Badge color={TEAM_CONFIGS[selectedTeam].color}>{eligiblePlayers.length}</Badge>
                </div>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {eligiblePlayers.map((p) => (
                    <div
                      key={p.licence}
                      onClick={() => addToRoster(p.licence)}
                      style={{
                        display: 'flex',
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{p.nom}</span>{' '}
                        <span style={{ fontSize: 13 }}>{p.prenom}</span>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {p.categorie} · {p.taille ? `${p.taille}cm` : '—'}
                        </div>
                      </div>
                      <span
                        style={{
                          color: TEAM_CONFIGS[selectedTeam].color,
                          fontSize: 16,
                          fontWeight: 700,
                        }}
                      >
                        +
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roster de l'équipe sélectionnée */}
              <div
                style={{
                  background: 'var(--card-bg)',
                  borderRadius: 14,
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>
                    Roster {selectedTeam} - {selectedSubTeam}
                  </span>
                  <Badge
                    color={
                      rosterPlayers.length >= TEAM_CONFIGS[selectedTeam].minRoster
                        ? '#22c55e'
                        : '#f59e0b'
                    }
                  >
                    {rosterPlayers.length}/{TEAM_CONFIGS[selectedTeam].maxRoster}
                  </Badge>
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {rosterPlayers.map((p, idx) => (
                    <div
                      key={p.licence}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 16px',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `${TEAM_CONFIGS[selectedTeam].color}22`,
                          color: TEAM_CONFIGS[selectedTeam].color,
                          fontSize: 11,
                          fontWeight: 800,
                          marginRight: 10,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{p.nom}</span>{' '}
                        <span style={{ fontSize: 13 }}>{p.prenom}</span>
                      </div>
                      <button
                        onClick={() => removeFromRoster(p.licence)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: 18,
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== OVERVIEW TAB (IMPRIMABLE) ===== */}
        {activeTab === 'overview' && (
          <div>
            <div
              className="no-print"
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}
            >
              <h2 style={{ margin: 0 }}>Rapport Global</h2>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  background: '#3b82f6',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                🖨️ Exporter en PDF
              </button>
            </div>

            <div
              className="print-card"
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}
            >
              <StatCard label="Total licenciées" value={players.length} icon="👥" color="#e2e8f0" />
              <StatCard label="Jeunes (< Senior)" value={totalJeunes} icon="🌟" color="#f59e0b" />
            </div>

            {/* Listes des équipes pour impression */}
            <h3 className="print-text-dark">Équipes constituées</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 16,
              }}
            >
              {Object.entries(teamRosters).map(([catId, subTeams]) => {
                const cfg = TEAM_CONFIGS[catId];
                return Object.entries(subTeams).map(([teamName, licences]) => {
                  if (licences.length === 0) return null;
                  const teamPlayers = licences
                    .map((l) => players.find((p) => p.licence === l))
                    .filter(Boolean);
                  return (
                    <div
                      key={`${catId}-${teamName}`}
                      className="print-card print-break"
                      style={{
                        background: 'var(--card-bg)',
                        borderRadius: 14,
                        border: `1px solid ${cfg.color}`,
                        padding: 16,
                      }}
                    >
                      <h4 style={{ margin: '0 0 10px', color: cfg.color }}>
                        {cfg.label} - {teamName}
                      </h4>
                      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 10px' }}>
                        Effectif : {teamPlayers.length} joueuses
                      </p>
                      <ul
                        style={{ paddingLeft: 16, margin: 0, fontSize: 12 }}
                        className="print-text-dark"
                      >
                        {teamPlayers.map((p) => (
                          <li key={p.licence} style={{ marginBottom: 4 }}>
                            <strong>{p.nom}</strong> {p.prenom}
                            <span style={{ color: 'var(--muted)', marginLeft: 6 }}>
                              ({p.categorie})
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
