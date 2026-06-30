import { useState, useEffect, useCallback } from 'react';
import { db, collection, query, where, orderBy, onSnapshot } from '../services/firebase';
import { useAuth } from './useAuth';

export function usePendingReviews(tenantIdOverride = null) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const effectiveTenantId = tenantIdOverride || user?.tenantId;

  useEffect(() => {
    if (!effectiveTenantId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const reviewsRef = collection(db, 'tenants', effectiveTenantId, 'pendingReviews');
    const q = query(
      reviewsRef,
      where('status', '==', 'pending'),
      orderBy('receivedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setReviews(results);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveTenantId]);

  const approveReview = useCallback(async (reviewId, correctedData) => {
    if (!effectiveTenantId) throw new Error('No tenant ID context');

    const functionsUrl = import.meta.env.DEV 
      ? 'http://localhost:5001/sales-analytics-51405/us-central1'
      : `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

    const url = `${functionsUrl}/manageReviews?action=approve`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': effectiveTenantId,
      },
      body: JSON.stringify({
        reviewId,
        tenantId: effectiveTenantId,
        correctedData,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to approve review');
    }

    return response.json();
  }, [effectiveTenantId]);

  const rejectReview = useCallback(async (reviewId, reason = '') => {
    if (!effectiveTenantId) throw new Error('No tenant ID context');

    const functionsUrl = import.meta.env.DEV 
      ? 'http://localhost:5001/sales-analytics-51405/us-central1'
      : `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

    const url = `${functionsUrl}/manageReviews?action=reject`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': effectiveTenantId,
      },
      body: JSON.stringify({
        reviewId,
        tenantId: effectiveTenantId,
        reason,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to reject review');
    }

    return response.json();
  }, [effectiveTenantId]);

  return {
    reviews,
    loading,
    error,
    approveReview,
    rejectReview,
  };
}
