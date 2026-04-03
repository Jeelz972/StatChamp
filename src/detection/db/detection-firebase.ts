import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import type { DetectionPlayer, DetectionSession, TestResult } from '../types/detection';

const DETECTION_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDiJhCMRoHRksgihMmBxkDnOagMOisFJMk',
  authDomain: 'statc-30921.firebaseapp.com',
  projectId: 'statc-30921',
  storageBucket: 'statc-30921.firebasestorage.app',
  messagingSenderId: '762498605407',
  appId: '1:762498605407:web:3e53d87ee57e4be72ef498',
};

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

const existing = firebase.apps.find((a) => a.name === 'detection');
const detectionApp = existing ?? firebase.initializeApp(DETECTION_FIREBASE_CONFIG, 'detection');
const db = detectionApp.firestore();
db.settings({ experimentalAutoDetectLongPolling: true, merge: true });

export const DetectionDB = {
  // --- Sessions ---
  async getSessions(): Promise<DetectionSession[]> {
    const snap = await db.collection('detection_sessions').orderBy('date', 'desc').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DetectionSession));
  },

  async saveSession(session: DetectionSession): Promise<void> {
    const { id, ...data } = session;
    await db.collection('detection_sessions').doc(id).set(stripUndefined(data as Record<string, unknown>));
  },

  async deleteSession(sessionId: string): Promise<void> {
    await db.collection('detection_sessions').doc(sessionId).delete();
  },

  onSessions(callback: (sessions: DetectionSession[]) => void): () => void {
    return db
      .collection('detection_sessions')
      .orderBy('date', 'desc')
      .onSnapshot((snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DetectionSession)));
      });
  },

  // --- Players ---
  async getPlayers(): Promise<DetectionPlayer[]> {
    const snap = await db.collection('detection_players').orderBy('lastName').get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DetectionPlayer));
  },

  async savePlayer(player: DetectionPlayer): Promise<void> {
    const { id, ...data } = player;
    await db.collection('detection_players').doc(id).set(stripUndefined(data as Record<string, unknown>));
  },

  async deletePlayer(playerId: string): Promise<void> {
    await db.collection('detection_players').doc(playerId).delete();
  },

  onPlayers(callback: (players: DetectionPlayer[]) => void): () => void {
    return db
      .collection('detection_players')
      .orderBy('lastName')
      .onSnapshot((snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DetectionPlayer)));
      });
  },

  // --- Results ---
  async getResultsBySession(sessionId: string): Promise<TestResult[]> {
    const snap = await db
      .collection('detection_results')
      .where('sessionId', '==', sessionId)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TestResult));
  },

  async getResultsByPlayer(playerId: string): Promise<TestResult[]> {
    const snap = await db
      .collection('detection_results')
      .where('playerId', '==', playerId)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TestResult));
  },

  async saveResult(result: TestResult): Promise<void> {
    const { id, ...data } = result;
    await db.collection('detection_results').doc(id).set(stripUndefined(data as Record<string, unknown>));
  },

  async saveResults(results: TestResult[]): Promise<void> {
    const batch = db.batch();
    for (const r of results) {
      const { id, ...data } = r;
      batch.set(db.collection('detection_results').doc(id), data);
    }
    await batch.commit();
  },

  async deleteResultsBySession(sessionId: string): Promise<void> {
    const snap = await db
      .collection('detection_results')
      .where('sessionId', '==', sessionId)
      .get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  onResultsBySession(
    sessionId: string,
    callback: (results: TestResult[]) => void
  ): () => void {
    return db
      .collection('detection_results')
      .where('sessionId', '==', sessionId)
      .onSnapshot((snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TestResult)));
      });
  },
};
