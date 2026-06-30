import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatCard from '../../src/components/ui/StatCard';
import { ShoppingCart } from 'lucide-react';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(
      <StatCard
        title="Total Sales"
        value="150"
        icon={ShoppingCart}
        color="text-primary-600 bg-primary-50"
      />
    );

    expect(screen.getByText('Total Sales')).toBeDefined();
    expect(screen.getByText('150')).toBeDefined();
  });

  it('renders without icon', () => {
    render(
      <StatCard
        title="Total Sales"
        value="150"
      />
    );

    expect(screen.getByText('Total Sales')).toBeDefined();
    expect(screen.getByText('150')).toBeDefined();
  });

  it('renders with custom value formatting', () => {
    render(
      <StatCard
        title="Revenue"
        value="$1,250.00"
        icon={ShoppingCart}
        color="text-green-600 bg-green-50"
      />
    );

    expect(screen.getByText('Revenue')).toBeDefined();
    expect(screen.getByText('$1,250.00')).toBeDefined();
  });

  it('handles zero value', () => {
    render(
      <StatCard
        title="Total Sales"
        value="0"
        icon={ShoppingCart}
        color="text-primary-600 bg-primary-50"
      />
    );

    expect(screen.getByText('0')).toBeDefined();
  });

  it('handles empty value', () => {
    const { container } = render(
      <StatCard
        title="Total Sales"
        value=""
        icon={ShoppingCart}
        color="text-primary-600 bg-primary-50"
      />
    );

    // The value paragraph exists even when empty
    const valuePara = container.querySelector('p.text-2xl');
    expect(valuePara).toBeDefined();
    expect(valuePara.textContent).toBe('');
  });
});
