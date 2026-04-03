import type { AgeCategory, Gender, BaremeThreshold } from '../types/detection';

function lb(s5: number, s4max: number, s3max: number, s2max: number): BaremeThreshold[] {
  return [
    { min: -Infinity, max: s5,    score: 5, label: 'Elite' },
    { min: s5,        max: s4max, score: 4, label: 'Excellent' },
    { min: s4max,     max: s3max, score: 3, label: 'Bien' },
    { min: s3max,     max: s2max, score: 2, label: 'Moyen' },
    { min: s2max,     max: Infinity, score: 1, label: 'Insuffisant' },
  ];
}

function hb(s2min: number, s3min: number, s4min: number, s5min: number): BaremeThreshold[] {
  return [
    { min: s5min,     max: Infinity, score: 5, label: 'Elite' },
    { min: s4min,     max: s5min,   score: 4, label: 'Excellent' },
    { min: s3min,     max: s4min,   score: 3, label: 'Bien' },
    { min: s2min,     max: s3min,   score: 2, label: 'Moyen' },
    { min: -Infinity, max: s2min,   score: 1, label: 'Insuffisant' },
  ];
}

function shooting(s1max: number, s2max: number, s3max: number, s4max: number): BaremeThreshold[] {
  return [
    { min: s4max + 1, max: Infinity, score: 5, label: 'Elite' },
    { min: s3max + 1, max: s4max + 1, score: 4, label: 'Excellent' },
    { min: s2max + 1, max: s3max + 1, score: 3, label: 'Bien' },
    { min: s1max + 1, max: s2max + 1, score: 2, label: 'Moyen' },
    { min: -Infinity, max: s1max + 1, score: 1, label: 'Insuffisant' },
  ];
}

type BaremeTable = Record<string, Record<Gender, Record<AgeCategory, BaremeThreshold[] | null>>>;

const B: BaremeTable = {
  // ===================== SPEED =====================

  sprint_15m: {
    M: { U11: lb(2.80, 3.00, 3.20, 3.45), U13: null, U15: null, U17: null, U18: null, U21: null, Senior: null },
    F: { U11: lb(3.00, 3.20, 3.45, 3.70), U13: null, U15: null, U17: null, U18: null, U21: null, Senior: null },
  },

  sprint_20m: {
    M: {
      U11: null,
      U13: lb(3.45, 3.60, 3.80, 4.00),
      U15: lb(3.30, 3.45, 3.60, 3.80),
      U17: lb(3.15, 3.30, 3.45, 3.65),
      U18: lb(3.05, 3.20, 3.35, 3.55),
      U21: lb(2.95, 3.10, 3.25, 3.45),
      Senior: lb(2.90, 3.05, 3.20, 3.40),
    },
    F: {
      U11: null,
      U13: lb(3.70, 3.85, 4.05, 4.25),
      U15: lb(3.55, 3.70, 3.90, 4.10),
      U17: lb(3.40, 3.55, 3.75, 3.95),
      U18: lb(3.30, 3.45, 3.65, 3.85),
      U21: lb(3.20, 3.35, 3.50, 3.70),
      Senior: lb(3.15, 3.30, 3.45, 3.65),
    },
  },

  sprint_3qt: {
    M: {
      U11: null,
      U13: lb(3.60, 3.80, 4.00, 4.25),
      U15: lb(3.45, 3.60, 3.80, 4.00),
      U17: lb(3.30, 3.45, 3.65, 3.85),
      U18: lb(3.20, 3.35, 3.50, 3.70),
      U21: lb(3.10, 3.25, 3.40, 3.60),
      Senior: lb(3.05, 3.20, 3.35, 3.55),
    },
    F: {
      U11: null,
      U13: lb(3.90, 4.10, 4.30, 4.55),
      U15: lb(3.75, 3.90, 4.10, 4.35),
      U17: lb(3.55, 3.70, 3.90, 4.15),
      U18: lb(3.45, 3.60, 3.80, 4.00),
      U21: lb(3.35, 3.50, 3.70, 3.90),
      Senior: lb(3.30, 3.45, 3.60, 3.80),
    },
  },

  suicide_17: {
    M: {
      U11: lb(33.0, 35.0, 37.0, 39.5),
      U13: lb(30.5, 32.0, 34.0, 36.0),
      U15: lb(28.0, 29.5, 31.0, 33.0),
      U17: lb(27.0, 28.5, 30.0, 32.0),
      U18: lb(26.0, 27.5, 29.0, 31.0),
      U21: lb(25.5, 27.0, 28.5, 30.0),
      Senior: lb(25.0, 26.5, 28.0, 30.0),
    },
    F: {
      U11: lb(35.5, 37.5, 40.0, 42.5),
      U13: lb(32.5, 34.0, 36.0, 38.5),
      U15: lb(30.0, 31.5, 33.5, 35.5),
      U17: lb(29.0, 30.5, 32.5, 34.5),
      U18: lb(28.0, 29.5, 31.5, 33.5),
      U21: lb(27.5, 29.0, 30.5, 32.5),
      Senior: lb(27.0, 28.5, 30.0, 32.0),
    },
  },

  // ===================== AGILITY =====================

  t_test: {
    M: {
      U11: lb(12.0, 12.8, 13.8, 15.0),
      U13: lb(11.2, 11.8, 12.6, 13.5),
      U15: lb(10.5, 11.0, 11.8, 12.5),
      U17: lb(10.0, 10.5, 11.2, 12.0),
      U18: lb(9.5, 10.0, 10.7, 11.5),
      U21: lb(9.2, 9.7, 10.4, 11.2),
      Senior: lb(9.0, 9.5, 10.2, 11.0),
    },
    F: {
      U11: lb(13.0, 14.0, 15.0, 16.2),
      U13: lb(12.2, 12.8, 13.6, 14.8),
      U15: lb(11.5, 12.0, 12.8, 13.8),
      U17: lb(11.0, 11.5, 12.3, 13.2),
      U18: lb(10.5, 11.0, 11.8, 12.7),
      U21: lb(10.2, 10.7, 11.5, 12.3),
      Senior: lb(10.0, 10.5, 11.2, 12.0),
    },
  },

  lane_agility: {
    M: {
      U11: lb(14.0, 15.0, 16.2, 17.5),
      U13: lb(13.0, 13.8, 14.8, 16.0),
      U15: lb(12.0, 12.7, 13.5, 14.5),
      U17: lb(11.5, 12.0, 12.8, 13.8),
      U18: lb(11.0, 11.5, 12.3, 13.2),
      U21: lb(10.7, 11.2, 12.0, 12.8),
      Senior: lb(10.5, 11.0, 11.8, 12.5),
    },
    F: {
      U11: lb(15.0, 16.0, 17.2, 18.5),
      U13: lb(14.0, 14.8, 15.8, 17.0),
      U15: lb(13.0, 13.7, 14.5, 15.5),
      U17: lb(12.5, 13.0, 13.8, 14.8),
      U18: lb(12.0, 12.5, 13.3, 14.3),
      U21: lb(11.7, 12.2, 13.0, 14.0),
      Senior: lb(11.5, 12.0, 12.8, 13.5),
    },
  },

  pro_agility: {
    M: {
      U11: lb(5.40, 5.70, 6.10, 6.50),
      U13: lb(5.10, 5.40, 5.70, 6.10),
      U15: lb(4.80, 5.10, 5.40, 5.80),
      U17: lb(4.60, 4.90, 5.20, 5.60),
      U18: lb(4.45, 4.70, 5.00, 5.40),
      U21: lb(4.30, 4.55, 4.85, 5.20),
      Senior: lb(4.20, 4.45, 4.75, 5.10),
    },
    F: {
      U11: lb(5.80, 6.10, 6.50, 7.00),
      U13: lb(5.50, 5.80, 6.15, 6.60),
      U15: lb(5.20, 5.50, 5.80, 6.20),
      U17: lb(5.00, 5.30, 5.60, 6.00),
      U18: lb(4.85, 5.10, 5.40, 5.80),
      U21: lb(4.70, 4.95, 5.25, 5.60),
      Senior: lb(4.60, 4.85, 5.15, 5.50),
    },
  },

  dribble_course: {
    M: {
      U11: lb(16.5, 18.0, 20.0, 22.5),
      U13: lb(15.0, 16.5, 18.5, 20.5),
      U15: lb(14.0, 15.5, 17.0, 19.0),
      U17: lb(13.0, 14.5, 16.0, 18.0),
      U18: lb(12.5, 13.8, 15.2, 17.0),
      U21: lb(12.0, 13.2, 14.5, 16.0),
      Senior: lb(11.5, 12.8, 14.0, 15.5),
    },
    F: {
      U11: lb(18.0, 20.0, 22.0, 25.0),
      U13: lb(16.5, 18.0, 20.0, 22.5),
      U15: lb(15.0, 16.5, 18.0, 20.0),
      U17: lb(14.0, 15.5, 17.0, 19.0),
      U18: lb(13.5, 14.8, 16.2, 18.0),
      U21: lb(13.0, 14.2, 15.5, 17.0),
      Senior: lb(12.5, 13.8, 15.0, 16.5),
    },
  },

  def_slides: {
    M: {
      U11: lb(10.5, 11.5, 12.5, 13.8),
      U13: lb(9.5, 10.2, 11.2, 12.2),
      U15: lb(8.5, 9.2, 10.0, 11.0),
      U17: lb(8.0, 8.7, 9.5, 10.5),
      U18: lb(7.5, 8.2, 9.0, 10.0),
      U21: lb(7.2, 7.8, 8.5, 9.5),
      Senior: lb(7.0, 7.6, 8.3, 9.2),
    },
    F: {
      U11: lb(11.5, 12.5, 13.5, 15.0),
      U13: lb(10.5, 11.2, 12.2, 13.5),
      U15: lb(9.5, 10.2, 11.0, 12.0),
      U17: lb(9.0, 9.7, 10.5, 11.5),
      U18: lb(8.5, 9.2, 10.0, 11.0),
      U21: lb(8.2, 8.8, 9.5, 10.5),
      Senior: lb(8.0, 8.6, 9.3, 10.2),
    },
  },

  // ===================== POWER =====================

  vert_no_step: {
    M: {
      U11: hb(17, 22, 27, 32),
      U13: hb(23, 30, 36, 42),
      U15: hb(28, 36, 43, 50),
      U17: hb(34, 42, 50, 58),
      U18: hb(38, 47, 56, 64),
      U21: hb(42, 52, 61, 70),
      Senior: hb(45, 55, 65, 75),
    },
    F: {
      U11: hb(13, 17, 21, 25),
      U13: hb(17, 22, 27, 32),
      U15: hb(20, 26, 32, 38),
      U17: hb(25, 32, 38, 44),
      U18: hb(29, 36, 42, 48),
      U21: hb(32, 39, 46, 52),
      Senior: hb(34, 41, 48, 55),
    },
  },

  vert_max: {
    M: {
      U11: hb(20, 26, 32, 38),
      U13: hb(27, 34, 41, 48),
      U15: hb(33, 42, 50, 58),
      U17: hb(40, 50, 59, 68),
      U18: hb(45, 56, 66, 76),
      U21: hb(50, 62, 73, 83),
      Senior: hb(55, 67, 78, 89),
    },
    F: {
      U11: hb(15, 20, 25, 30),
      U13: hb(20, 26, 32, 38),
      U15: hb(24, 31, 38, 45),
      U17: hb(30, 38, 45, 52),
      U18: hb(34, 42, 50, 58),
      U21: hb(38, 47, 55, 63),
      Senior: hb(41, 50, 58, 67),
    },
  },

  broad_jump: {
    M: {
      U11: hb(120, 140, 155, 170),
      U13: hb(140, 160, 180, 195),
      U15: hb(160, 180, 200, 220),
      U17: hb(180, 200, 220, 240),
      U18: hb(195, 215, 235, 255),
      U21: hb(205, 230, 250, 270),
      Senior: hb(215, 240, 260, 280),
    },
    F: {
      U11: hb(100, 120, 135, 150),
      U13: hb(120, 140, 160, 175),
      U15: hb(140, 160, 175, 190),
      U17: hb(155, 175, 195, 210),
      U18: hb(165, 185, 205, 220),
      U21: hb(175, 195, 215, 230),
      Senior: hb(180, 200, 220, 240),
    },
  },

  // ===================== ENDURANCE =====================

  yoyo_ir1: {
    M: {
      U11: null,
      U13: null,
      U15: hb(11.0, 13.0, 15.0, 17.0),
      U17: hb(12.5, 14.5, 16.5, 18.5),
      U18: hb(13.5, 15.5, 17.5, 19.5),
      U21: hb(14.5, 16.5, 18.5, 20.5),
      Senior: hb(15.0, 17.0, 19.0, 21.0),
    },
    F: {
      U11: null,
      U13: null,
      U15: hb(9.0, 11.0, 13.0, 14.5),
      U17: hb(10.0, 12.0, 14.0, 16.0),
      U18: hb(11.0, 13.0, 15.0, 17.0),
      U21: hb(11.5, 13.5, 15.5, 17.5),
      Senior: hb(12.0, 14.0, 16.0, 18.0),
    },
  },

  luc_leger: {
    M: {
      U11: hb(5.0, 6.0, 7.0, 8.0),
      U13: hb(6.0, 7.5, 8.5, 9.5),
      U15: hb(7.0, 8.5, 9.5, 10.5),
      U17: hb(8.0, 9.0, 10.0, 11.0),
      U18: hb(8.5, 10.0, 11.0, 12.0),
      U21: hb(9.0, 10.5, 11.5, 12.5),
      Senior: hb(9.5, 11.0, 12.0, 13.0),
    },
    F: {
      U11: hb(4.0, 5.0, 6.0, 7.0),
      U13: hb(5.0, 6.0, 7.0, 8.0),
      U15: hb(6.0, 7.0, 8.0, 9.0),
      U17: hb(6.5, 7.5, 8.5, 9.5),
      U18: hb(7.0, 8.0, 9.0, 10.0),
      U21: hb(7.5, 8.5, 9.5, 10.5),
      Senior: hb(8.0, 9.0, 10.0, 11.0),
    },
  },

  // ===================== SHOOTING =====================

  ft_10: {
    M: {
      U11: shooting(1, 3, 5, 7),
      U13: shooting(1, 3, 5, 7),
      U15: shooting(2, 4, 6, 8),
      U17: shooting(2, 4, 6, 8),
      U18: shooting(3, 5, 7, 8),
      U21: shooting(3, 5, 7, 9),
      Senior: shooting(4, 6, 7, 9),
    },
    F: {
      U11: shooting(1, 3, 5, 7),
      U13: shooting(1, 3, 5, 7),
      U15: shooting(2, 4, 6, 8),
      U17: shooting(2, 4, 6, 8),
      U18: shooting(3, 5, 7, 8),
      U21: shooting(3, 5, 7, 9),
      Senior: shooting(4, 6, 7, 9),
    },
  },

  midrange_10: {
    M: {
      U11: shooting(0, 2, 4, 6),
      U13: shooting(0, 2, 4, 6),
      U15: shooting(1, 3, 5, 7),
      U17: shooting(1, 3, 5, 7),
      U18: shooting(2, 4, 6, 8),
      U21: shooting(2, 4, 6, 8),
      Senior: shooting(3, 5, 6, 8),
    },
    F: {
      U11: shooting(0, 2, 4, 6),
      U13: shooting(0, 2, 4, 6),
      U15: shooting(1, 3, 5, 7),
      U17: shooting(1, 3, 5, 7),
      U18: shooting(2, 4, 6, 8),
      U21: shooting(2, 4, 6, 8),
      Senior: shooting(3, 5, 6, 8),
    },
  },

  three_pt_10: {
    M: {
      U11: null,
      U13: shooting(0, 1, 2, 4),
      U15: shooting(0, 2, 4, 6),
      U17: shooting(1, 3, 5, 7),
      U18: shooting(1, 3, 5, 7),
      U21: shooting(2, 4, 6, 8),
      Senior: shooting(2, 4, 6, 8),
    },
    F: {
      U11: null,
      U13: shooting(0, 1, 2, 4),
      U15: shooting(0, 2, 4, 6),
      U17: shooting(1, 3, 5, 7),
      U18: shooting(1, 3, 5, 7),
      U21: shooting(2, 4, 6, 8),
      Senior: shooting(2, 4, 6, 8),
    },
  },

  catch_shoot: {
    M: {
      U11: null,
      U13: null,
      U15: shooting(0, 2, 4, 6),
      U17: shooting(1, 2, 4, 6),
      U18: shooting(1, 3, 5, 7),
      U21: shooting(2, 4, 5, 7),
      Senior: shooting(2, 4, 6, 7),
    },
    F: {
      U11: null,
      U13: null,
      U15: shooting(0, 2, 4, 6),
      U17: shooting(1, 2, 4, 6),
      U18: shooting(1, 3, 5, 7),
      U21: shooting(2, 4, 5, 7),
      Senior: shooting(2, 4, 6, 7),
    },
  },
};

export function getBareme(
  testId: string,
  gender: Gender,
  category: AgeCategory
): BaremeThreshold[] | null {
  return B[testId]?.[gender]?.[category] ?? null;
}

export function scoreRawValue(
  testId: string,
  rawValue: number,
  gender: Gender,
  category: AgeCategory
): number | null {
  const thresholds = getBareme(testId, gender, category);
  if (!thresholds) return null;

  for (const t of thresholds) {
    if (rawValue >= t.min && rawValue < t.max) return t.score;
  }

  // Edge case: rawValue == exact upper bound of last threshold (e.g. 10/10 for shooting)
  const lastMatch = thresholds.filter((t) => rawValue >= t.min).pop();
  return lastMatch?.score ?? 1;
}

export function getScoreLabel(score: number): string {
  switch (score) {
    case 5: return 'Elite';
    case 4: return 'Excellent';
    case 3: return 'Bien';
    case 2: return 'Moyen';
    case 1: return 'Insuffisant';
    default: return '';
  }
}

export function getScoreColor(score: number): string {
  switch (score) {
    case 5: return '#22c55e';
    case 4: return '#3b82f6';
    case 3: return '#f59e0b';
    case 2: return '#f97316';
    case 1: return '#ef4444';
    default: return '#6b7280';
  }
}
