import { describe, it, expect } from 'vitest';
import { scoreRawValue, getScoreLabel } from '../engine/baremes';
import { getEligibleTests, isTestEligible } from '../engine/test-catalog';
import { computePlayerProfile, rankPlayers } from '../engine/detection-engine';
import type { TestResult } from '../types/detection';

describe('baremes.scoreRawValue', () => {
  it('scores sprint_20m for M/U17 correctly', () => {
    expect(scoreRawValue('sprint_20m', 3.10, 'M', 'U17')).toBe(5);
    expect(scoreRawValue('sprint_20m', 3.25, 'M', 'U17')).toBe(4);
    expect(scoreRawValue('sprint_20m', 3.40, 'M', 'U17')).toBe(3);
    expect(scoreRawValue('sprint_20m', 3.50, 'M', 'U17')).toBe(2);
    expect(scoreRawValue('sprint_20m', 3.80, 'M', 'U17')).toBe(1);
  });

  it('returns null for ineligible test', () => {
    expect(scoreRawValue('sprint_20m', 3.50, 'M', 'U11')).toBeNull();
    expect(scoreRawValue('three_pt_10', 5, 'F', 'U11')).toBeNull();
    expect(scoreRawValue('yoyo_ir1', 15.0, 'M', 'U13')).toBeNull();
  });

  it('scores higher_better correctly (vert_no_step M/U15)', () => {
    expect(scoreRawValue('vert_no_step', 55, 'M', 'U15')).toBe(5);
    expect(scoreRawValue('vert_no_step', 45, 'M', 'U15')).toBe(4);
    expect(scoreRawValue('vert_no_step', 38, 'M', 'U15')).toBe(3);
    expect(scoreRawValue('vert_no_step', 30, 'M', 'U15')).toBe(2);
    expect(scoreRawValue('vert_no_step', 20, 'M', 'U15')).toBe(1);
  });

  it('scores shooting tests correctly (ft_10 M/U18)', () => {
    expect(scoreRawValue('ft_10', 10, 'M', 'U18')).toBe(5);
    expect(scoreRawValue('ft_10', 8, 'M', 'U18')).toBe(4);
    expect(scoreRawValue('ft_10', 6, 'M', 'U18')).toBe(3);
    expect(scoreRawValue('ft_10', 4, 'M', 'U18')).toBe(2);
    expect(scoreRawValue('ft_10', 1, 'M', 'U18')).toBe(1);
  });

  it('scores U11-specific sprint_15m', () => {
    expect(scoreRawValue('sprint_15m', 2.70, 'M', 'U11')).toBe(5);
    expect(scoreRawValue('sprint_15m', 3.50, 'M', 'U11')).toBe(1);
  });

  it('scores F baremes with correct gender offset', () => {
    expect(scoreRawValue('sprint_20m', 3.35, 'F', 'U17')).toBe(5);
    expect(scoreRawValue('sprint_20m', 3.35, 'M', 'U17')).toBe(3);
  });
});

describe('test-catalog.getEligibleTests', () => {
  it('U11 gets 15 eligible tests', () => {
    const tests = getEligibleTests('U11');
    expect(tests.length).toBe(15);
    expect(tests.find((t) => t.id === 'sprint_15m')).toBeDefined();
    expect(tests.find((t) => t.id === 'sprint_20m')).toBeUndefined();
    expect(tests.find((t) => t.id === 'three_pt_10')).toBeUndefined();
    expect(tests.find((t) => t.id === 'catch_shoot')).toBeUndefined();
    expect(tests.find((t) => t.id === 'yoyo_ir1')).toBeUndefined();
  });

  it('U13 gets 19 eligible tests', () => {
    const tests = getEligibleTests('U13');
    expect(tests.length).toBe(19);
    expect(tests.find((t) => t.id === 'sprint_15m')).toBeUndefined();
    expect(tests.find((t) => t.id === 'sprint_20m')).toBeDefined();
    expect(tests.find((t) => t.id === 'three_pt_10')).toBeDefined();
    expect(tests.find((t) => t.id === 'yoyo_ir1')).toBeUndefined();
  });

  it('U15+ gets all 22 tests', () => {
    for (const cat of ['U15', 'U17', 'U18', 'U21', 'Senior'] as const) {
      expect(getEligibleTests(cat).length).toBe(22);
    }
  });
});

describe('test-catalog.isTestEligible', () => {
  it('sprint_15m only for U11', () => {
    expect(isTestEligible('sprint_15m', 'U11')).toBe(true);
    expect(isTestEligible('sprint_15m', 'U13')).toBe(false);
    expect(isTestEligible('sprint_15m', 'Senior')).toBe(false);
  });
});

describe('detection-engine.computePlayerProfile', () => {
  const makeResult = (testId: string, raw: number, score: number): TestResult => ({
    id: `r_${testId}`,
    sessionId: 's1',
    playerId: 'p1',
    testId,
    rawValue: raw,
    score,
    timestamp: new Date().toISOString(),
  });

  it('computes axis scores and composite', () => {
    const results: TestResult[] = [
      makeResult('sprint_20m', 3.20, 4),
      makeResult('t_test', 10.3, 4),
      makeResult('vert_no_step', 50, 4),
      makeResult('luc_leger', 10.0, 4),
      makeResult('ft_10', 8, 4),
    ];

    const profile = computePlayerProfile('p1', results, 'M', 'U17');
    expect(profile.axisScores.speed).toBe(4);
    expect(profile.axisScores.agility).toBe(4);
    expect(profile.axisScores.power).toBe(4);
    expect(profile.axisScores.endurance).toBe(4);
    expect(profile.axisScores.shooting).toBe(4);
    expect(profile.compositeScore).toBe(4);
  });

  it('handles missing axes gracefully', () => {
    const results: TestResult[] = [makeResult('sprint_20m', 3.20, 4)];
    const profile = computePlayerProfile('p1', results, 'M', 'U17');
    expect(profile.axisScores.speed).toBe(4);
    expect(profile.axisScores.agility).toBe(0);
    expect(profile.compositeScore).toBe(4);
  });
});

describe('detection-engine.rankPlayers', () => {
  it('ranks by composite descending', () => {
    const profiles = [
      { playerId: 'a', axisScores: { speed: 3, agility: 3, power: 3, endurance: 3, shooting: 3, anthropometry: 0 }, compositeScore: 3, testResults: {} },
      { playerId: 'b', axisScores: { speed: 5, agility: 5, power: 5, endurance: 5, shooting: 5, anthropometry: 0 }, compositeScore: 5, testResults: {} },
      { playerId: 'c', axisScores: { speed: 4, agility: 4, power: 4, endurance: 4, shooting: 4, anthropometry: 0 }, compositeScore: 4, testResults: {} },
    ];
    const ranked = rankPlayers(profiles);
    expect(ranked.map((p) => p.playerId)).toEqual(['b', 'c', 'a']);
  });

  it('ranks by specific axis', () => {
    const profiles = [
      { playerId: 'a', axisScores: { speed: 5, agility: 1, power: 1, endurance: 1, shooting: 1, anthropometry: 0 }, compositeScore: 1.8, testResults: {} },
      { playerId: 'b', axisScores: { speed: 1, agility: 5, power: 5, endurance: 5, shooting: 5, anthropometry: 0 }, compositeScore: 4.2, testResults: {} },
    ];
    const ranked = rankPlayers(profiles, 'speed');
    expect(ranked[0].playerId).toBe('a');
  });
});

describe('getScoreLabel', () => {
  it('returns correct labels', () => {
    expect(getScoreLabel(5)).toBe('Elite');
    expect(getScoreLabel(1)).toBe('Insuffisant');
  });
});
