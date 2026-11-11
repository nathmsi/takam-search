import { israelToday } from './israel-today';

describe('israelToday', () => {
  afterEach(() => jest.useRealTimers());

  it('writes today as an ISO date', () => {
    expect(israelToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses the date in Israel, not in UTC (11:30 pm in UTC is already tomorrow in Israel)', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-11T23:30:00Z'));

    expect(israelToday()).toBe('2026-11-12');
  });
});
