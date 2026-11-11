import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts with the value it is given', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 250));

    expect(result.current).toBe('a');
  });

  it('follows a new value only after it has stopped changing', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 250), { initialProps: { value: 'a' } });

    rerender({ value: 'ab' });
    act(() => void vi.advanceTimersByTime(200));
    rerender({ value: 'abc' });
    act(() => void vi.advanceTimersByTime(200));
    expect(result.current).toBe('a');
    act(() => void vi.advanceTimersByTime(50));

    expect(result.current).toBe('abc');
  });
});
