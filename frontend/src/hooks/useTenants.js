import { useState, useEffect, useCallback } from 'react';
import { db, collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot } from '../services/firebase';
import { useAuth } from './useAuth';

export function useTenants() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    const tenantsRef = collection(db, 'tenants');

    const unsubscribe = onSnapshot(
      tenantsRef,
      (snapshot) => {
        const results = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setTenants(results);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const createTenant = useCallback(async (data) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const tenantCode = data.tenantCode || generateTenantCode(data.name);
    const tenantsRef = collection(db, 'tenants');
    const docRef = doc(tenantsRef);

    const tenantData = {
      ...data,
      tenantCode: tenantCode.toUpperCase(),
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      plan: data.plan || 'basic',
    };

    await setDoc(docRef, tenantData);
    return { id: docRef.id, ...tenantData };
  }, [user]);

  const updateTenant = useCallback(async (tenantId, data) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const docRef = doc(db, 'tenants', tenantId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });

    const updated = await getDoc(docRef);
    return { id: updated.id, ...updated.data() };
  }, [user]);

  const deactivateTenant = useCallback(async (tenantId) => {
    return updateTenant(tenantId, { status: 'inactive' });
  }, [updateTenant]);

  const activateTenant = useCallback(async (tenantId) => {
    return updateTenant(tenantId, { status: 'active' });
  }, [updateTenant]);

  const deleteTenant = useCallback(async (tenantId) => {
    if (!user || user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    const docRef = doc(db, 'tenants', tenantId);
    await deleteDoc(docRef);
  }, [user]);

  const getTenantStats = useCallback(async (tenantId) => {
    const salesRef = collection(db, 'tenants', tenantId, 'sales');
    const agentsRef = collection(db, 'tenants', tenantId, 'agents');

    const [salesSnapshot, agentsSnapshot] = await Promise.all([
      getDocs(salesRef),
      getDocs(agentsRef),
    ]);

    let totalSales = 0;
    let totalRevenue = 0;
    let totalQuantity = 0;

    salesSnapshot.forEach((doc) => {
      const data = doc.data();
      totalSales++;
      totalRevenue += data.totalValue || 0;
      totalQuantity += data.quantity || 0;
    });

    return {
      totalSales,
      totalRevenue,
      totalQuantity,
      totalAgents: agentsSnapshot.size,
      avgSaleValue: totalSales > 0 ? totalRevenue / totalSales : 0,
    };
  }, []);

  return {
    tenants,
    loading,
    error,
    createTenant,
    updateTenant,
    deactivateTenant,
    activateTenant,
    deleteTenant,
    getTenantStats,
  };
}

function generateTenantCode(name) {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4) || 'TEN';
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}${suffix}`;
}
