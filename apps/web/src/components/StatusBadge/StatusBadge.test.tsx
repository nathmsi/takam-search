import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('says "in force" in words', () => {
    render(<StatusBadge isInForce />);

    expect(screen.getByText('בתוקף')).toBeInTheDocument();
  });

  it('says "not in force" in words', () => {
    render(<StatusBadge isInForce={false} />);

    expect(screen.getByText('לא בתוקף')).toBeInTheDocument();
  });
});
