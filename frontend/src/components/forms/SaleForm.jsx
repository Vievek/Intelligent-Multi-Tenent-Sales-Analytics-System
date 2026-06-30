import React, { useState } from 'react';

export default function SaleForm({ initialData = {}, agents = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    product: initialData.product || '',
    quantity: initialData.quantity || '',
    price: initialData.price || '',
    agentId: initialData.agentId || '',
    date: initialData.date
      ? new Date(initialData.date.seconds ? initialData.date.seconds * 1000 : initialData.date)
          .toISOString()
          .slice(0, 16)
      : new Date().toISOString().slice(0, 16),
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.product.trim()) newErrors.product = 'Product name is required';
    if (!formData.quantity || Number(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive integer';
    }
    if (!formData.price || Number(formData.price) < 0) {
      newErrors.price = 'Price must be a positive number';
    }
    if (!formData.agentId) newErrors.agentId = 'Agent assignment is required';
    if (!formData.date) newErrors.date = 'Sale date is required';

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
          Product Name
        </label>
        <input
          type="text"
          value={formData.product}
          onChange={(e) => setFormData({ ...formData, product: e.target.value })}
          placeholder="e.g. Mangoes"
          className="input w-full"
        />
        {errors.product && <p className="text-rose-400 text-xs mt-1">{errors.product}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Quantity
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="e.g. 10"
            className="input w-full"
          />
          {errors.quantity && <p className="text-rose-400 text-xs mt-1">{errors.quantity}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Unit Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="e.g. 5.00"
            className="input w-full"
          />
          {errors.price && <p className="text-rose-400 text-xs mt-1">{errors.price}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Assigned Agent
        </label>
        <select
          value={formData.agentId}
          onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
          className="input w-full"
        >
          <option value="">— Select an Agent —</option>
          {agents.map((agent) => (
            <option key={agent.telegramUserId} value={agent.telegramUserId}>
              {agent.name} ({agent.telegramUserId})
            </option>
          ))}
        </select>
        {errors.agentId && <p className="text-rose-400 text-xs mt-1">{errors.agentId}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Date & Time
        </label>
        <input
          type="datetime-local"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="input w-full"
        />
        {errors.date && <p className="text-rose-400 text-xs mt-1">{errors.date}</p>}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-muted">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {initialData.id ? 'Save Changes' : 'Record Sale'}
        </button>
      </div>
    </form>
  );
}
