import type {
  TestResult,
  PlayerProfile,
  PlayerAxisScores,
  AgeCategory,
  Gender,
} from '../types/detection';
import { getTestById, TEST_CATALOG } from './test-catalog';
import { scoreRawValue } from './baremes';

type AxisKey = keyof PlayerAxisScores;

const TEST_TO_AXIS: Record<string, AxisKey> = {};
for (const t of TEST_CATALOG) {
  if (t.category === 'speed') TEST_TO_AXIS[t.id] = 'speed';
  else if (t.category === 'agility') TEST_TO_AXIS[t.id] = 'agility';
  else if (t.category === 'power') TEST_TO_AXIS[t.id] = 'power';
  else if (t.category === 'endurance') TEST_TO_AXIS[t.id] = 'endurance';
  else if (t.category === 'shooting') TEST_TO_AXIS[t.id] = 'shooting';
  else if (t.category === 'anthropometry') TEST_TO_AXIS[t.id] = 'anthropometry';
}

export function computePlayerProfile(
  playerId: string,
  results: TestResult[],
  gender: Gender,
  category: AgeCategory
): PlayerProfile {
  const playerResults = results.filter((r) => r.playerId === playerId);

  // Best attempt per test
  const bestByTest = new Map<string, TestResult>();
  for (const r of playerResults) {
    const existing = bestByTest.get(r.testId);
    if (!existing || r.score > existing.score || (r.score === existing.score && isBetterRaw(r, existing))) {
      bestByTest.set(r.testId, r);
    }
  }

  // Compute scored results
  const testResults: Record<string, { raw: number; score: number }> = {};
  for (const [testId, result] of bestByTest) {
    const score = scoreRawValue(testId, result.rawValue, gender, category);
    if (score !== null) {
      testResults[testId] = { raw: result.rawValue, score };
    }
  }

  // Group by axis and average
  const axisAccum: Record<AxisKey, number[]> = {
    speed: [],
    agility: [],
    power: [],
    endurance: [],
    shooting: [],
    anthropometry: [],
  };

  for (const [testId, { score }] of Object.entries(testResults)) {
    const axis = TEST_TO_AXIS[testId];
    if (axis && axis !== 'anthropometry') {
      axisAccum[axis].push(score);
    }
  }

  const axisScores: PlayerAxisScores = {
    speed: avg(axisAccum.speed),
    agility: avg(axisAccum.agility),
    power: avg(axisAccum.power),
    endurance: avg(axisAccum.endurance),
    shooting: avg(axisAccum.shooting),
    anthropometry: 0, // Computed separately via percentile
  };

  // Composite = mean of non-zero axes (excluding anthropometry)
  const nonZeroAxes = [
    axisScores.speed,
    axisScores.agility,
    axisScores.power,
    axisScores.endurance,
    axisScores.shooting,
  ].filter((v) => v > 0);

  const compositeScore =
    nonZeroAxes.length > 0
      ? Number((nonZeroAxes.reduce((a, b) => a + b, 0) / nonZeroAxes.length).toFixed(2))
      : 0;

  return { playerId, axisScores, compositeScore, testResults };
}

export function computeAnthropometryPercentiles(profiles: PlayerProfile[]): void {
  const heightMap = new Map<string, number>();
  const wingspanMap = new Map<string, number>();
  const reachMap = new Map<string, number>();

  for (const p of profiles) {
    if (p.testResults['height_barefoot']) heightMap.set(p.playerId, p.testResults['height_barefoot'].raw);
    if (p.testResults['wingspan']) wingspanMap.set(p.playerId, p.testResults['wingspan'].raw);
    if (p.testResults['standing_reach']) reachMap.set(p.playerId, p.testResults['standing_reach'].raw);
  }

  const anthropoScores = new Map<string, number>();
  for (const p of profiles) {
    const h = heightMap.get(p.playerId);
    const w = wingspanMap.get(p.playerId);
    const r = reachMap.get(p.playerId);
    if (h === undefined) continue;

    let composite = 0;
    let count = 0;

    if (w !== undefined) { composite += w / h; count++; }
    if (r !== undefined) { composite += r / h; count++; }
    composite += h / 220;
    count++;

    anthropoScores.set(p.playerId, count > 0 ? composite / count : 0);
  }

  const values = [...anthropoScores.values()].sort((a, b) => a - b);
  for (const p of profiles) {
    const val = anthropoScores.get(p.playerId);
    if (val === undefined) continue;
    const rank = values.filter((v) => v <= val).length;
    p.axisScores.anthropometry = Number(((rank / values.length) * 5).toFixed(2));
  }
}

export function rankPlayers(
  profiles: PlayerProfile[],
  sortAxis?: keyof PlayerAxisScores
): PlayerProfile[] {
  return [...profiles].sort((a, b) => {
    if (sortAxis) return b.axisScores[sortAxis] - a.axisScores[sortAxis];
    return b.compositeScore - a.compositeScore;
  });
}

export function compareProfiles(
  a: PlayerProfile,
  b: PlayerProfile
): { axisDeltas: Record<keyof PlayerAxisScores, number>; compositeDelta: number } {
  const axes: (keyof PlayerAxisScores)[] = [
    'speed', 'agility', 'power', 'endurance', 'shooting', 'anthropometry',
  ];
  const axisDeltas = {} as Record<keyof PlayerAxisScores, number>;
  for (const ax of axes) {
    axisDeltas[ax] = Number((a.axisScores[ax] - b.axisScores[ax]).toFixed(2));
  }
  return {
    axisDeltas,
    compositeDelta: Number((a.compositeScore - b.compositeScore).toFixed(2)),
  };
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
}

function isBetterRaw(a: TestResult, b: TestResult): boolean {
  const test = getTestById(a.testId);
  if (!test) return false;
  return test.direction === 'higher_better' ? a.rawValue > b.rawValue : a.rawValue < b.rawValue;
}
