import { useState, useEffect, useCallback } from 'react';
import { db, collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc } from '../services/firebase';
import { useAuth } from './useAuth';

export function useAgents(tenantIdOverride = null) {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const effectiveTenantId = tenantIdOverride || user?.tenantId;

  useEffect(() => {
    if (!effectiveTenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const agentsRef = collection(db, 'tenants', effectiveTenantId, 'agents');

    const unsubscribe = onSnapshot(
      agentsRef,
      (snapshot) => {
        const results = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
        setAgents(results);
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

  const createAgent = useCallback(async (agentData) => {
    if (!effectiveTenantId) throw new Error('No tenant ID context');
    const { telegramUserId } = agentData;
    if (!telegramUserId) throw new Error('Telegram User ID is required');

    const docRef = doc(db, 'tenants', effectiveTenantId, 'agents', telegramUserId);
    const newAgent = {
      telegramUserId,
      name: agentData.name,
      chatId: agentData.chatId ? Number(agentData.chatId) : null,
      status: 'active',
      registeredAt: new Date().toISOString(),
      messageCount: 0,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, newAgent);
    return { id: telegramUserId, ...newAgent };
  }, [effectiveTenantId]);

  const updateAgent = useCallback(async (agentId, agentData) => {
    if (!effectiveTenantId) throw new Error('No tenant ID context');
    const docRef = doc(db, 'tenants', effectiveTenantId, 'agents', agentId);
    
    const updateData = {
      ...agentData,
      chatId: agentData.chatId ? Number(agentData.chatId) : null,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updateData);
    const snap = await getDoc(docRef);
    return { id: snap.id, ...snap.data() };
  }, [effectiveTenantId]);

  const deleteAgent = useCallback(async (agentId) => {
    if (!effectiveTenantId) throw new Error('No tenant ID context');
    const docRef = doc(db, 'tenants', effectiveTenantId, 'agents', agentId);
    await deleteDoc(docRef);
  }, [effectiveTenantId]);

  const toggleAgentStatus = useCallback(async (agentId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'blocked' : 'active';
    return updateAgent(agentId, { status: nextStatus });
  }, [updateAgent]);

  return {
    agents,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
  };
}
