export type Gender = 'M' | 'F';

export type AgeCategory = 'U11' | 'U13' | 'U15' | 'U17' | 'U18' | 'U21' | 'Senior';

export type TestCategory = 'speed' | 'agility' | 'power' | 'endurance' | 'shooting' | 'anthropometry';

export type ScoreDirection = 'lower_better' | 'higher_better';

export type SessionStatus = 'draft' | 'active' | 'completed';

export interface DetectionPlayer {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: Gender;
  category: AgeCategory;
  club?: string;
  position?: string;
  rosterPlayerId?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface DetectionSession {
  id: string;
  name: string;
  date: string;
  location?: string;
  categories: AgeCategory[];
  genders: Gender[];
  playerIds: string[];
  testIds: string[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TestDefinition {
  id: string;
  name: string;
  shortName: string;
  category: TestCategory;
  unit: string;
  direction: ScoreDirection;
  description: string;
  precision: number;
  minValue?: number;
  maxValue?: number;
  excludedCategories?: AgeCategory[];
}

export interface TestResult {
  id: string;
  sessionId: string;
  playerId: string;
  testId: string;
  rawValue: number;
  score: number;
  attempt?: number;
  timestamp: string;
  recordedBy?: string;
}

export interface BaremeThreshold {
  min: number;
  max: number;
  score: number;
  label: string;
}

export interface BaremeEntry {
  testId: string;
  gender: Gender;
  category: AgeCategory;
  thresholds: BaremeThreshold[];
}

export interface PlayerAxisScores {
  speed: number;
  agility: number;
  power: number;
  endurance: number;
  shooting: number;
  anthropometry: number;
}

export interface PlayerProfile {
  playerId: string;
  axisScores: PlayerAxisScores;
  compositeScore: number;
  testResults: Record<string, { raw: number; score: number }>;
}
