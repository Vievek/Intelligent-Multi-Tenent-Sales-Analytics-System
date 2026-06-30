import { useState, useEffect, useCallback } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, getDocs } from '../services/firebase';
import { useAuth } from './useAuth';

export function useSales(options = {}) {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // tenantId can be overridden by admin to inspect any tenant's sales
  const { startDate, endDate, agentId, product, limit: limitCount = 100, tenantId: tenantIdOverride } = options;

  const buildQuery = useCallback(() => {
    const effectiveTenantId = tenantIdOverride || user?.tenantId;
    if (!effectiveTenantId) {
      return null;
    }

    const salesRef = collection(db, 'tenants', effectiveTenantId, 'sales');
    let constraints = [orderBy('date', 'desc')];

    if (startDate) {
      constraints.unshift(where('date', '>=', startDate));
    }
    if (endDate) {
      constraints.unshift(where('date', '<=', endDate));
    }
    if (agentId) {
      constraints.unshift(where('agentId', '==', agentId));
    }
    if (product) {
      constraints.unshift(where('product', '==', product));
    }

    return query(salesRef, ...constraints);
  }, [user, tenantIdOverride, startDate, endDate, agentId, product]);

  useEffect(() => {
    const effectiveTenantId = tenantIdOverride || user?.tenantId;
    if (!effectiveTenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = buildQuery();
    if (!q) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setSales(results.slice(0, limitCount));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildQuery, limitCount, user]);

  const getStats = useCallback(() => {
    if (sales.length === 0) {
      return { totalSales: 0, totalRevenue: 0, totalQuantity: 0, avgSaleValue: 0 };
    }

    let totalRevenue = 0;
    let totalQuantity = 0;
    for (const sale of sales) {
      totalRevenue += sale.totalValue || 0;
      totalQuantity += sale.quantity || 0;
    }

    return {
      totalSales: sales.length,
      totalRevenue,
      totalQuantity,
      avgSaleValue: sales.length > 0 ? totalRevenue / sales.length : 0,
    };
  }, [sales]);

  const getTopProducts = useCallback((n = 10) => {
    const productMap = {};
    for (const sale of sales) {
      const key = sale.product || 'unknown';
      if (!productMap[key]) {
        productMap[key] = { product: key, totalQuantity: 0, totalRevenue: 0, count: 0 };
      }
      productMap[key].totalQuantity += sale.quantity || 0;
      productMap[key].totalRevenue += sale.totalValue || 0;
      productMap[key].count++;
    }

    return Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, n);
  }, [sales]);

  const getSalesByDate = useCallback((interval = 'day') => {
    const groups = {};
    for (const sale of sales) {
      const date = sale.date?.toDate ? sale.date.toDate() : new Date(sale.date);
      let key;
      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        const week = getWeekNumber(date);
        key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!groups[key]) {
        groups[key] = { date: key, count: 0, revenue: 0, quantity: 0 };
      }
      groups[key].count++;
      groups[key].revenue += sale.totalValue || 0;
      groups[key].quantity += sale.quantity || 0;
    }

    return Object.entries(groups)
      .map(([key, value]) => ({ ...value, key }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [sales]);

  const refresh = useCallback(async () => {
    if (!user || !user.tenantId) return;
    const q = buildQuery();
    if (!q) return;
    const snapshot = await getDocs(q);
    const results = [];
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    setSales(results.slice(0, limitCount));
  }, [buildQuery, limitCount, user]);

  const createSale = useCallback(async (saleData) => {
    const effectiveTenantId = tenantIdOverride || user?.tenantId;
    if (!effectiveTenantId) throw new Error('No tenant ID context');

    const salesRef = collection(db, 'tenants', effectiveTenantId, 'sales');
    const docRef = doc(salesRef);
    
    const quantity = Number(saleData.quantity) || 1;
    const price = Number(saleData.price) || 0;
    const totalValue = quantity * price;

    const newSale = {
      product: saleData.product,
      quantity,
      price,
      totalValue,
      date: saleData.date ? new Date(saleData.date).toISOString() : new Date().toISOString(),
      rawMessage: saleData.rawMessage || `Manual sale: ${quantity} ${saleData.product} for $${totalValue}`,
      agentId: saleData.agentId || 'manual',
      tenantId: effectiveTenantId,
      confidence: saleData.confidence || 'HIGH',
      extractionMethod: saleData.extractionMethod || 'manual',
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await setDoc(docRef, newSale);
    return { id: docRef.id, ...newSale };
  }, [user, tenantIdOverride]);

  const updateSale = useCallback(async (saleId, saleData) => {
    const effectiveTenantId = tenantIdOverride || user?.tenantId;
    if (!effectiveTenantId) throw new Error('No tenant ID context');

    const docRef = doc(db, 'tenants', effectiveTenantId, 'sales', saleId);
    
    const quantity = Number(saleData.quantity);
    const price = Number(saleData.price);
    const updateData = {
      ...saleData,
      updatedAt: new Date().toISOString(),
    };

    if (!isNaN(quantity)) updateData.quantity = quantity;
    if (!isNaN(price)) updateData.price = price;
    if (!isNaN(quantity) && !isNaN(price)) {
      updateData.totalValue = quantity * price;
    } else if (!isNaN(quantity) || !isNaN(price)) {
      const snap = await getDoc(docRef);
      const cur = snap.data();
      const q = !isNaN(quantity) ? quantity : (cur.quantity || 0);
      const p = !isNaN(price) ? price : (cur.price || 0);
      updateData.totalValue = q * p;
    }

    await updateDoc(docRef, updateData);
    const updatedSnap = await getDoc(docRef);
    return { id: updatedSnap.id, ...updatedSnap.data() };
  }, [user, tenantIdOverride]);

  const deleteSale = useCallback(async (saleId) => {
    const effectiveTenantId = tenantIdOverride || user?.tenantId;
    if (!effectiveTenantId) throw new Error('No tenant ID context');

    const docRef = doc(db, 'tenants', effectiveTenantId, 'sales', saleId);
    await deleteDoc(docRef);
  }, [user, tenantIdOverride]);

  return {
    sales,
    loading,
    error,
    refresh,
    getStats,
    getTopProducts,
    getSalesByDate,
    createSale,
    updateSale,
    deleteSale,
  };
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}
