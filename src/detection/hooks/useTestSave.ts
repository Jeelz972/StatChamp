import { useCallback } from 'react';
import { DetectionDB } from '../db/detection-firebase';
import { scoreRawValue } from '../engine/baremes';
import type { TestResult, Gender, AgeCategory } from '../types/detection';

export function useTestSave(sessionId: string) {
  const save = useCallback(
    async (
      testId: string,
      playerId: string,
      rawValue: number,
      gender: Gender,
      category: AgeCategory
    ): Promise<TestResult | undefined> => {
      const score = scoreRawValue(testId, rawValue, gender, category);
      if (score === null) return undefined;

      const result: TestResult = {
        id: `${sessionId}_${playerId}_${testId}`,
        sessionId,
        playerId,
        testId,
        rawValue,
        score,
        timestamp: new Date().toISOString(),
      };

      await DetectionDB.saveResult(result);
      return result;
    },
    [sessionId]
  );

  return { save };
}
