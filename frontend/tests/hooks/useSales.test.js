import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSales } from '../../src/hooks/useSales';
import { useAuth } from '../../src/hooks/useAuth';
import * as firebase from '../../src/services/firebase';

vi.mock('../../src/hooks/useAuth');

describe('useSales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { tenantId: 'tenant1', role: 'tenant' },
      loading: false,
    });
  });

  it('returns empty array when no user', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
    const { result } = renderHook(() => useSales());
    expect(result.current.sales).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('returns stats correctly', () => {
    const { result } = renderHook(() => useSales());
    
    act(() => {
      result.current.sales = [
        { totalValue: 100, quantity: 5 },
        { totalValue: 200, quantity: 10 },
      ];
    });

    const stats = result.current.getStats();
    expect(stats.totalSales).toBe(2);
    expect(stats.totalRevenue).toBe(300);
    expect(stats.totalQuantity).toBe(15);
    expect(stats.avgSaleValue).toBe(150);
  });

  it('returns zero stats for empty sales', () => {
    const { result } = renderHook(() => useSales());
    const stats = result.current.getStats();
    expect(stats.totalSales).toBe(0);
    expect(stats.totalRevenue).toBe(0);
    expect(stats.totalQuantity).toBe(0);
    expect(stats.avgSaleValue).toBe(0);
  });

  it('gets top products correctly', () => {
    const { result } = renderHook(() => useSales());
    
    act(() => {
      result.current.sales = [
        { product: 'apple', totalValue: 100, quantity: 5 },
        { product: 'mango', totalValue: 200, quantity: 10 },
        { product: 'apple', totalValue: 50, quantity: 2 },
      ];
    });

    const topProducts = result.current.getTopProducts(2);
    expect(topProducts.length).toBe(2);
    expect(topProducts[0].product).toBe('mango');
    expect(topProducts[0].totalRevenue).toBe(200);
    expect(topProducts[1].product).toBe('apple');
    expect(topProducts[1].totalRevenue).toBe(150);
  });

  it('gets sales by date correctly', () => {
    const { result } = renderHook(() => useSales());
    
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-02');
    
    act(() => {
      result.current.sales = [
        { date: date1, totalValue: 100, quantity: 5 },
        { date: date1, totalValue: 50, quantity: 2 },
        { date: date2, totalValue: 200, quantity: 10 },
      ];
    });

    const salesByDate = result.current.getSalesByDate('day');
    expect(salesByDate.length).toBe(2);
    expect(salesByDate[0].revenue).toBe(150);
    expect(salesByDate[0].count).toBe(2);
    expect(salesByDate[1].revenue).toBe(200);
    expect(salesByDate[1].count).toBe(1);
  });

  it('handles sales with missing fields gracefully', () => {
    const { result } = renderHook(() => useSales());
    
    act(() => {
      result.current.sales = [
        { totalValue: undefined, quantity: undefined },
        { totalValue: null, quantity: null },
        {},
      ];
    });

    const stats = result.current.getStats();
    expect(stats.totalRevenue).toBe(0);
    expect(stats.totalQuantity).toBe(0);
  });
});
