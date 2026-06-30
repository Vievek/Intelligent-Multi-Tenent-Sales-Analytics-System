import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AuthProvider, useAuth } from '../../src/hooks/useAuth';
import React from 'react';

vi.mock('../../src/services/firebase', () => ({
  auth: {},
  onAuthChange: vi.fn().mockImplementation((callback) => {
    callback(null);
    return vi.fn();
  }),
  logOut: vi.fn().mockResolvedValue(),
}));

describe('useAuth', () => {
  it('throws error when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
  });

  it('provides auth context when inside provider', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(typeof result.current.signOut).toBe('function');
  });
});
