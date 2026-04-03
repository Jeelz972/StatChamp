// ═══════════════════════════════════════════════════════════════
// DB Layer — team-aware Firestore wrapper with dataMode bridge
// ═══════════════════════════════════════════════════════════════

let _teamId: string | null = null;
let _dataMode: string = 'legacy';

function getWk(): string {
  return sessionStorage.getItem('statchamp_wk') || localStorage.getItem('statchamp_wk') || '';
}

function getDb(): any {
  return (window as any).db;
}

function resolveDocRef(docName: string): any {
  if (_dataMode === 'namespaced' && _teamId) {
    return getDb().collection('teams').doc(_teamId).collection('data').doc(docName);
  }
  return getDb().collection('team_data').doc(docName);
}

function resolveCollectionRef(collectionName: string): any {
  if (_dataMode === 'namespaced' && _teamId) {
    return getDb().collection('teams').doc(_teamId).collection(collectionName);
  }
  return getDb().collection(collectionName);
}

export const DB = {
  get currentDataMode(): string {
    return _dataMode;
  },

  // ========== TEAM CONFIG ==========
  setTeam(teamId: string | null, dataMode?: string) {
    _teamId = teamId;
    if (dataMode) _dataMode = dataMode;
    if (teamId) {
      localStorage.setItem('statchamp_team_id', teamId);
    } else {
      localStorage.removeItem('statchamp_team_id');
    }
  },

  async initTeam(teamId: string): Promise<void> {
    _teamId = teamId;
    localStorage.setItem('statchamp_team_id', teamId);
    const db = getDb();
    if (!db) return;
    try {
      const doc = await db.collection('teams').doc(teamId).get();
      _dataMode = doc.exists ? (doc.data()?.dataMode ?? 'legacy') : 'legacy';
    } catch (_) {
      _dataMode = 'legacy';
    }
  },

  getTeamId(): string | null {
    return _teamId;
  },

  getTeams() {
    const db = getDb();
    if (!db) return Promise.resolve([]);
    return db
      .collection('teams')
      .get()
      .then((snap: any) => snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })));
  },

  getCredentials() {
    return getDb().collection('app_config').doc('credentials').get();
  },

  // ========== ROSTER ==========
  getRoster() {
    return resolveDocRef('roster').get();
  },
  onRoster(callback: (doc: any) => void) {
    return resolveDocRef('roster').onSnapshot(callback);
  },
  saveRoster(list: any[]) {
    return resolveDocRef('roster').set({ list, _wk: getWk() });
  },

  // ========== PHASES ==========
  getPhases() {
    return resolveDocRef('phases').get();
  },
  onPhases(callback: (doc: any) => void) {
    return resolveDocRef('phases').onSnapshot(callback);
  },
  savePhases(list: any[]) {
    return resolveDocRef('phases').set({ list, _wk: getWk() });
  },

  // ========== CONFIG ==========
  getConfig() {
    return resolveDocRef('config').get();
  },
  saveConfig(data: Record<string, any>) {
    return resolveDocRef('config').set({ ...data, _wk: getWk() }, { merge: true });
  },

  // ========== SEASONS ==========
  onSeasons(callback: (doc: any) => void) {
    return resolveDocRef('seasons').onSnapshot(callback);
  },
  saveSeasons(list: any[]) {
    return resolveDocRef('seasons').set({ list, _wk: getWk() });
  },

  // ========== GAMES ==========
  getGames() {
    return resolveCollectionRef('games')
      .get()
      .then((snapshot: any) =>
        snapshot.docs.map((doc: any) => doc.data()).filter((g: any) => !g._deleted)
      );
  },
  getGame(gameId: string) {
    return resolveCollectionRef('games').doc(gameId).get();
  },
  onGames(callback: (games: any[]) => void) {
    return resolveCollectionRef('games').onSnapshot((snapshot: any) => {
      const gamesList = snapshot.docs.map((doc: any) => doc.data()).filter((g: any) => !g._deleted);
      callback(gamesList);
    });
  },
  saveGame(game: any) {
    if (!game || !game.id) return Promise.reject(new Error('Game sans id'));
    const payload = { ...game, _wk: getWk(), updatedAt: new Date().toISOString() };
    return resolveCollectionRef('games').doc(game.id).set(payload);
  },
  deleteGame(gameId: string) {
    return resolveCollectionRef('games').doc(gameId).set({
      id: gameId,
      _deleted: true,
      _wk: getWk(),
      updatedAt: new Date().toISOString(),
    });
  },

  // ========== GAME PREPS ==========
  getPrep(prepId: string) {
    return resolveCollectionRef('gamePreps').doc(prepId).get();
  },
  savePrep(prepId: string, data: Record<string, any>) {
    const payload = { ...data, _wk: getWk(), updatedAt: new Date().toISOString() };
    return resolveCollectionRef('gamePreps').doc(prepId).set(payload, { merge: true });
  },
};

// Shim global (live.html et scripts inline utilisent window.DB)
if (typeof window !== 'undefined') {
  (window as any).DB = DB;
  const savedTeamId = localStorage.getItem('statchamp_team_id');
  if (savedTeamId) _teamId = savedTeamId;
}
