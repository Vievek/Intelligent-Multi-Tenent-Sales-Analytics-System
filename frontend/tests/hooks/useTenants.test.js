import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTenants } from '../../src/hooks/useTenants';
import { useAuth } from '../../src/hooks/useAuth';

vi.mock('../../src/hooks/useAuth');

describe('useTenants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when user is not admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'tenant', uid: 'user1' },
      loading: false,
    });
    const { result } = renderHook(() => useTenants());
    expect(result.current.tenants).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('returns empty array when no user', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
    const { result } = renderHook(() => useTenants());
    expect(result.current.tenants).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('generates tenant code from business name', () => {
    const { result } = renderHook(() => useTenants());
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'admin', uid: 'admin1' },
      loading: false,
    });

    const createTenant = result.current.createTenant;
    expect(createTenant).toBeDefined();
  });

  it('throws error when non-admin tries to create tenant', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'tenant', uid: 'user1' },
      loading: false,
    });
    const { result } = renderHook(() => useTenants());

    await expect(result.current.createTenant({ name: 'Test' })).rejects.toThrow('Admin access required');
  });

  it('throws error when non-admin tries to update tenant', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'tenant', uid: 'user1' },
      loading: false,
    });
    const { result } = renderHook(() => useTenants());

    await expect(result.current.updateTenant('tenant1', {})).rejects.toThrow('Admin access required');
  });

  it('throws error when non-admin tries to delete tenant', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: 'tenant', uid: 'user1' },
      loading: false,
    });
    const { result } = renderHook(() => useTenants());

    await expect(result.current.deleteTenant('tenant1')).rejects.toThrow('Admin access required');
  });
});
