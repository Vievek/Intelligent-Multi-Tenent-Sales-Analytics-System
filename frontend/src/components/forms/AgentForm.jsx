import React, { useState } from 'react';

export default function AgentForm({ initialData = {}, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    telegramUserId: initialData.telegramUserId || '',
    name: initialData.name || '',
    chatId: initialData.chatId || '',
  });
  const [errors, setErrors] = useState({});

  const isEdit = !!initialData.telegramUserId;

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Agent Name is required';
    if (!isEdit) {
      if (!formData.telegramUserId.trim()) {
        newErrors.telegramUserId = 'Telegram User ID is required';
      } else if (!/^\d+$/.test(formData.telegramUserId.trim())) {
        newErrors.telegramUserId = 'Telegram User ID must be a numeric string';
      }
    }
    if (formData.chatId && !/^-?\d+$/.test(String(formData.chatId).trim())) {
      newErrors.chatId = 'Chat ID must be an integer';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Telegram User ID (Unique Key)
        </label>
        <input
          type="text"
          value={formData.telegramUserId}
          onChange={(e) => setFormData({ ...formData, telegramUserId: e.target.value })}
          disabled={isEdit}
          placeholder="e.g. 111222333"
          className="input w-full"
        />
        {errors.telegramUserId && <p className="text-rose-400 text-xs mt-1">{errors.telegramUserId}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Agent Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Agent Smith"
          className="input w-full"
        />
        {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Chat ID (Optional)
        </label>
        <input
          type="text"
          value={formData.chatId}
          onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
          placeholder="e.g. 12345"
          className="input w-full"
        />
        {errors.chatId && <p className="text-rose-400 text-xs mt-1">{errors.chatId}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-muted">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {isEdit ? 'Save Changes' : 'Register Agent'}
        </button>
      </div>
    </form>
  );
}
