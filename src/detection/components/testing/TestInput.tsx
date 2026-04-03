import React, { useRef, useState, useEffect } from 'react';
import { scoreRawValue } from '../../engine/baremes';
import type { Gender, AgeCategory, TestResult } from '../../types/detection';

interface TestInputProps {
  testId: string;
  playerId: string;
  sessionId: string;
  currentValue?: number;
  precision: number;
  unit: string;
  minValue?: number;
  maxValue?: number;
  disabled?: boolean;
  gender: Gender;
  category: AgeCategory;
  onSave: (result: TestResult) => void;
}

type SaveState = 'idle' | 'saved' | 'error';

export function TestInput({
  testId,
  playerId,
  sessionId,
  currentValue,
  precision,
  unit,
  minValue,
  maxValue,
  disabled,
  gender,
  category,
  onSave,
}: TestInputProps) {
  const [localValue, setLocalValue] = useState(
    currentValue !== undefined ? currentValue.toFixed(precision) : ''
  );
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const flashRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync if prop changes (e.g. from Firebase listener)
  useEffect(() => {
    if (currentValue !== undefined) {
      setLocalValue(currentValue.toFixed(precision));
    }
  }, [currentValue, precision]);

  function isOutOfRange(val: string): boolean {
    const n = parseFloat(val);
    if (isNaN(n)) return false;
    if (minValue !== undefined && n < minValue) return true;
    if (maxValue !== undefined && n > maxValue) return true;
    return false;
  }

  async function saveValue(raw: string) {
    const trimmed = raw.trim().replace(',', '.');
    if (trimmed === '') return;
    const n = parseFloat(trimmed);
    if (isNaN(n)) return;
    if (isOutOfRange(trimmed)) return;

    const rounded = Number(n.toFixed(precision));
    const score = scoreRawValue(testId, rounded, gender, category);
    if (score === null) return;

    const result: TestResult = {
      id: `${sessionId}_${playerId}_${testId}`,
      sessionId,
      playerId,
      testId,
      rawValue: rounded,
      score,
      timestamp: new Date().toISOString(),
    };

    try {
      onSave(result);
      setSaveState('saved');
      clearTimeout(flashRef.current);
      flashRef.current = setTimeout(() => setSaveState('idle'), 300);
      setLocalValue(rounded.toFixed(precision));
    } catch {
      setSaveState('error');
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveValue(raw), 1500);
  };

  const handleBlur = () => {
    clearTimeout(timerRef.current);
    saveValue(localValue);
  };

  const outOfRange = isOutOfRange(localValue);

  const borderClass = disabled
    ? 'border-border'
    : saveState === 'saved'
    ? 'border-emerald-500'
    : saveState === 'error'
    ? 'border-red-500'
    : outOfRange
    ? 'border-red-500'
    : localValue
    ? 'border-accent/50'
    : 'border-border';

  // Width hint: /10 values are narrow, cm values are wider
  const widthClass = unit === '/10' ? 'w-16' : unit === 'cm' ? 'w-24' : 'w-20';

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={unit}
      disabled={disabled}
      className={`${widthClass} rounded-md border bg-background px-2 py-1.5 text-center text-sm font-mono transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-accent ${borderClass} ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      } ${saveState === 'saved' ? 'bg-emerald-500/10' : ''}`}
    />
  );
}
