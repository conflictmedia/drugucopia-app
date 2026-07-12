import {
  dailyCounts,
  weeklyCounts,
  monthlyCounts,
  substanceBreakdown,
  categoryBreakdown,
  estimateTolerance,
  computeStreakInsights,
  pieColor,
} from '@/lib/analytics';
import { DoseLog } from '@/types';
import { format } from 'date-fns';

const createDose = (overrides: Partial<DoseLog> = {}): DoseLog => ({
  id: `dose_${Date.now()}_${Math.random()}`,
  substanceId: 'test',
  substanceName: 'Test Substance',
  categories: ['stimulants'],
  amount: 100,
  unit: 'mg',
  route: 'oral',
  timestamp: new Date().toISOString(),
  duration: null,
  notes: null,
  mood: null,
  setting: null,
  intensity: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Analytics', () => {
  describe('dailyCounts', () => {
    it('returns empty array for no doses', () => {
      const result = dailyCounts([], 7);
      expect(result).toHaveLength(7);
      expect(result.every(d => d.count === 0)).toBe(true);
    });

    it('counts doses per day correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const doses = [
        createDose({ timestamp: today.toISOString() }),
        createDose({ timestamp: today.toISOString() }),
        createDose({ timestamp: yesterday.toISOString() }),
      ];

      const result = dailyCounts(doses, 7);
      const todayLabel = format(today, "MMM d");
      const yesterdayLabel = format(yesterday, "MMM d");
      const todayEntry = result.find(d => d.label === todayLabel);
      const yesterdayEntry = result.find(d => d.label === yesterdayLabel);

      expect(todayEntry?.count).toBe(2);
      expect(yesterdayEntry?.count).toBe(1);
    });

    it('limits to specified number of days', () => {
      const doses = Array.from({ length: 100 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return createDose({ timestamp: date.toISOString() });
      });

      const result = dailyCounts(doses, 30);
      expect(result).toHaveLength(30);
    });

    it('handles doses outside the range', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 1);

      const doses = [createDose({ timestamp: oldDate.toISOString() })];
      const result = dailyCounts(doses, 7);
      expect(result.every(d => d.count === 0)).toBe(true);
    });
  });

  describe('weeklyCounts', () => {
    it('returns empty array for no doses', () => {
      const result = weeklyCounts([], 4);
      expect(result).toHaveLength(4);
      expect(result.every(w => w.count === 0)).toBe(true);
    });

    it('groups doses by week (Sunday start)', () => {
      // Use dates relative to now to ensure they're within the range
      const now = new Date();
      // Find the most recent Sunday (or today if today is Sunday)
      const lastSunday = new Date(now);
      lastSunday.setDate(now.getDate() - now.getDay());
      const lastMonday = new Date(lastSunday);
      lastMonday.setDate(lastSunday.getDate() + 1);
      const prevSunday = new Date(lastSunday);
      prevSunday.setDate(lastSunday.getDate() - 7);

      const doses = [
        createDose({ timestamp: lastSunday.toISOString() }),
        createDose({ timestamp: lastMonday.toISOString() }),
        createDose({ timestamp: prevSunday.toISOString() }),
      ];

      const result = weeklyCounts(doses, 4);
      // Use weekStart (ISO date string) to find entries
      const lastSundayStart = lastSunday.toISOString().slice(0, 10);
      const prevSundayStart = prevSunday.toISOString().slice(0, 10);

      const week1 = result.find(w => w.weekStart === lastSundayStart);
      const week2 = result.find(w => w.weekStart === prevSundayStart);

      expect(week1?.count).toBe(2);
      expect(week2?.count).toBe(1);
    });

    it('limits to specified number of weeks', () => {
      const doses = Array.from({ length: 100 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i * 7);
        return createDose({ timestamp: date.toISOString() });
      });

      const result = weeklyCounts(doses, 12);
      expect(result).toHaveLength(12);
    });
  });

  describe('monthlyCounts', () => {
    it('returns empty array for no doses', () => {
      const result = monthlyCounts([], 12);
      expect(result).toHaveLength(12);
      expect(result.every(m => m.count === 0)).toBe(true);
    });

it('groups doses by month', () => {
      // Use local dates that are definitely in the past
      const now = new Date();
      // Use 1st, 2nd, 3rd of current and previous months (definitely past)
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 2);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 3);

      const doses = [
        createDose({ timestamp: thisMonth.toISOString() }),
        createDose({ timestamp: lastMonth.toISOString() }),
        createDose({ timestamp: twoMonthsAgo.toISOString() }),
      ];

      const result = monthlyCounts(doses, 12);
      // Use monthStart (ISO date string) to find entries
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);

      const thisMonthEntry = result.find(m => m.monthStart === thisMonthStart);
      const lastMonthEntry = result.find(m => m.monthStart === lastMonthStart);
      const twoMonthsAgoEntry = result.find(m => m.monthStart === twoMonthsAgoStart);

      expect(thisMonthEntry?.count).toBe(1);
      expect(lastMonthEntry?.count).toBe(1);
      expect(twoMonthsAgoEntry?.count).toBe(1);
    });
  });

  describe('substanceBreakdown', () => {
    it('returns empty array for no doses', () => {
      const result = substanceBreakdown([]);
      expect(result).toHaveLength(0);
    });

    it('counts doses per substance', () => {
      const doses = [
        createDose({ substanceName: 'Caffeine', substanceId: 'caffeine' }),
        createDose({ substanceName: 'Caffeine', substanceId: 'caffeine' }),
        createDose({ substanceName: 'Alcohol', substanceId: 'alcohol' }),
      ];

      const result = substanceBreakdown(doses);
      expect(result).toHaveLength(2);
      expect(result.find(s => s.name === 'Caffeine')?.value).toBe(2);
      expect(result.find(s => s.name === 'Alcohol')?.value).toBe(1);
    });

    it('sorts by count descending', () => {
      const doses = [
        createDose({ substanceName: 'A' }),
        createDose({ substanceName: 'B' }),
        createDose({ substanceName: 'B' }),
        createDose({ substanceName: 'C' }),
        createDose({ substanceName: 'C' }),
        createDose({ substanceName: 'C' }),
      ];

      const result = substanceBreakdown(doses);
      expect(result[0].name).toBe('C');
      expect(result[1].name).toBe('B');
      expect(result[2].name).toBe('A');
    });
  });

  describe('categoryBreakdown', () => {
it('returns empty array for no doses', () => {
      const result = categoryBreakdown([]);
      expect(result).toHaveLength(0);
    });

    it('counts doses per category', () => {
      const doses = [
        createDose({ categories: ['stimulants'] }),
        createDose({ categories: ['stimulants'] }),
        createDose({ categories: ['depressants'] }),
        createDose({ categories: ['stimulants', 'empathogens'] }),
      ];

      const result = categoryBreakdown(doses);
      const stimulants = result.find(c => c.name === 'stimulants');
      const depressants = result.find(c => c.name === 'depressants');
      const empathogens = result.find(c => c.name === 'empathogens');

      expect(stimulants?.value).toBe(3);
      expect(depressants?.value).toBe(1);
      expect(empathogens?.value).toBe(1);
    });
  });

  describe('estimateTolerance', () => {
    it('returns empty array for no doses', () => {
      const result = estimateTolerance([]);
      expect(result).toHaveLength(0);
    });

    it('calculates tolerance for recent doses', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const doses = [
        createDose({ substanceName: 'Caffeine', substanceId: 'caffeine', timestamp: threeDaysAgo.toISOString() }),
        createDose({ substanceName: 'Caffeine', substanceId: 'caffeine', timestamp: new Date().toISOString() }),
      ];

      const result = estimateTolerance(doses);
      expect(result).toHaveLength(1);
      expect(result[0].substanceName).toBe('Caffeine');
      expect(result[0].dosesLast30Days).toBe(2);
      expect(result[0].currentLevel).toBeGreaterThan(0);
    });

    it('returns baseline for old doses only', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);

      const doses = [createDose({ timestamp: oldDate.toISOString() })];
      const result = estimateTolerance(doses);

      expect(result[0].level).toBe('baseline');
      expect(result[0].currentLevel).toBe(0);
      expect(result[0].daysToBaseline).toBe(0);
    });

    it('includes explanation in result', () => {
      const doses = [createDose({ timestamp: new Date().toISOString() })];
      const result = estimateTolerance(doses);
      expect(result[0].explanation).toBeDefined();
      expect(typeof result[0].explanation).toBe('string');
    });
  });

  describe('computeStreakInsights', () => {
    it('returns zeros for no doses', () => {
      const result = computeStreakInsights([]);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.currentRestStreak).toBe(0);
      expect(result.avgDosesPerActiveDay30d).toBe(0);
    });

    it('calculates current streak correctly', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const doses = [
        createDose({ timestamp: today.toISOString() }),
        createDose({ timestamp: yesterday.toISOString() }),
        createDose({ timestamp: twoDaysAgo.toISOString() }),
      ];

      const result = computeStreakInsights(doses);
      expect(result.currentStreak).toBe(3);
    });

    it('calculates longest streak', () => {
      const baseDate = new Date();
      // Set to 20 days ago
      baseDate.setDate(baseDate.getDate() - 20);
      const doses: DoseLog[] = [];

      for (let i = 0; i < 5; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);
        doses.push(createDose({ timestamp: date.toISOString() }));
      }

      for (let i = 0; i < 3; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + 10 + i);
        doses.push(createDose({ timestamp: date.toISOString() }));
      }

      const result = computeStreakInsights(doses);
      expect(result.longestStreak).toBe(5);
    });

    it('calculates rest streak (days since last dose)', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      const doses = [createDose({ timestamp: fiveDaysAgo.toISOString() })];
      const result = computeStreakInsights(doses);
      expect(result.currentRestStreak).toBe(5);
    });

    it('calculates average doses per active day', () => {
      const baseDate = new Date();
      // Set to 10 days ago
      baseDate.setDate(baseDate.getDate() - 10);
      const doses: DoseLog[] = [];

      for (let day = 0; day < 10; day++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + day);
        for (let dose = 0; dose < 2; dose++) {
          doses.push(createDose({ timestamp: date.toISOString() }));
        }
      }

      const result = computeStreakInsights(doses);
      expect(result.avgDosesPerActiveDay30d).toBeCloseTo(2, 0);
    });

    it('identifies most active day of week', () => {
      const doses: DoseLog[] = [];
      const baseDate = new Date();
      // Set to 4 weeks ago
      baseDate.setDate(baseDate.getDate() - 28);
      // Get the day of week for baseDate (0 = Sunday)
      const baseDayOfWeek = baseDate.getDay();

      for (let week = 0; week < 4; week++) {
        for (let day = 0; day < 3; day++) {
          const date = new Date(baseDate);
          date.setDate(baseDate.getDate() + week * 7 + day);
          doses.push(createDose({ timestamp: date.toISOString() }));
        }
      }

      const result = computeStreakInsights(doses);
      expect(result.mostActiveDayOfWeek).toBeDefined();
      // The most active days should be the first 3 days of the week from baseDate
      const expectedDays = [
        baseDayOfWeek,
        (baseDayOfWeek + 1) % 7,
        (baseDayOfWeek + 2) % 7,
      ];
      const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const expectedLabels = expectedDays.map(d => dayLabels[d]);
      expect(expectedLabels).toContain(result.mostActiveDayOfWeek?.label);
    });

    it('identifies most active hour', () => {
      const doses: DoseLog[] = [];
      const baseDate = new Date();
      baseDate.setHours(20, 0, 0, 0); // 8 PM

      for (let i = 0; i < 10; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() - i);
        doses.push(createDose({ timestamp: date.toISOString() }));
      }

      const result = computeStreakInsights(doses);
      expect(result.mostActiveHour).toBeDefined();
      expect(result.mostActiveHour?.hour).toBe(20);
    });
  });

  describe('pieColor', () => {
    it('returns valid color strings', () => {
      for (let i = 0; i < 20; i++) {
        const color = pieColor(i);
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it('returns different colors for different indices', () => {
      const colors = new Set();
      for (let i = 0; i < 10; i++) {
        colors.add(pieColor(i));
      }
      expect(colors.size).toBe(10);
    });
  });
});