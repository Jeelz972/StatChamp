import { useEffect, useRef } from 'react';
import { useDataStore } from '../stores/data-store';
import { useAuthStore } from '../stores/auth-store';
import { DB } from './firebase';

const PRECONFIGURED_FIREBASE = {
  apiKey: 'AIzaSyBaA99che1oz9BHc23IhiFoY-nK0xvg4q4',
  authDomain: 'statu18elite.firebaseapp.com',
  projectId: 'statu18elite',
  storageBucket: 'statu18elite.firebasestorage.app',
  messagingSenderId: '862850988986',
  appId: '1:862850988986:web:935de245b5c13e29f6fb83',
};

export function useFirebaseSync() {
  const {
    setPlayers, setGames, setPhases, setSeasons,
    setDataLoaded, setPlayTypes,
    players, games, phases, isDataLoaded,
  } = useDataStore();

  const unsubsRef = useRef<Array<() => void>>([]);
  const currentTeamId = useAuthStore((s) => s.currentTeamId);

  // --- 1. Firebase init (runs once) ---
  useEffect(() => {
    const firebase = (window as any).firebase;
    const savedFbConfig = localStorage.getItem('basket_firebase_config');
    const savedPhases = localStorage.getItem('basket_phases');

    if (savedPhases) {
      try { setPhases(JSON.parse(savedPhases)); } catch (_) {}
    }

    let config: any = null;
    if (PRECONFIGURED_FIREBASE.apiKey && !savedFbConfig) {
      config = PRECONFIGURED_FIREBASE;
    } else if (savedFbConfig) {
      try { config = JSON.parse(savedFbConfig); } catch (_) {}
    }

    if (!config || !firebase) {
      setPlayers(JSON.parse(localStorage.getItem('basket_players') || '[]'));
      setGames(JSON.parse(localStorage.getItem('basket_games') || '[]'));
      setDataLoaded(true);
      return;
    }

    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      const database = firebase.firestore();
      (window as any).db = database;
    } catch (e) {
      console.error('Firebase init error:', e);
      setPlayers(JSON.parse(localStorage.getItem('basket_players') || '[]'));
      setGames(JSON.parse(localStorage.getItem('basket_games') || '[]'));
      setDataLoaded(true);
    }
  }, []);

  // --- 2. Listeners (restarts when team changes) ---
  useEffect(() => {
    if (!currentTeamId || !(window as any).db) return;

    unsubsRef.current.forEach((fn) => fn());
    unsubsRef.current = [];

    const unsub1 = DB.onRoster((doc: any) => {
      if (doc.exists && doc.data().list) {
        setPlayers(doc.data().list);
      } else {
        setPlayers(JSON.parse(localStorage.getItem('basket_players') || '[]'));
      }
      setDataLoaded(true);
    });

    const unsub2 = DB.onGames((gamesList: any[]) => {
      if (gamesList.length > 0) setGames(gamesList);
      else setGames(JSON.parse(localStorage.getItem('basket_games') || '[]'));
    });

    const unsub3 = DB.onPhases((doc: any) => {
      if (doc.exists && doc.data().list) {
        const loadedPhases = doc.data().list;
        const seasons = useDataStore.getState().seasons;
        const patchedPhases = loadedPhases.map((p: any) => {
          if (!p.seasonId && seasons.length === 1) {
            return { ...p, seasonId: seasons[0].id };
          }
          return p;
        });
        setPhases(patchedPhases);
      }
    });

    const unsub4 = DB.onSeasons((doc: any) => {
      if (doc.exists && doc.data().list) setSeasons(doc.data().list);
    });

    unsubsRef.current = [unsub1, unsub2, unsub3, unsub4];

    DB.getConfig()
      .then((doc: any) => {
        if (doc.exists && doc.data().playTypes) setPlayTypes(doc.data().playTypes);
      })
      .catch(() => {});

    return () => {
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = [];
    };
  }, [currentTeamId]);

  // --- 3. Persistence localStorage (fallback offline) ---
  useEffect(() => {
    if (isDataLoaded) localStorage.setItem('basket_players', JSON.stringify(players));
  }, [players, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) localStorage.setItem('basket_games', JSON.stringify(games));
  }, [games, isDataLoaded]);

  useEffect(() => {
    localStorage.setItem('basket_phases', JSON.stringify(phases));
  }, [phases]);
}
