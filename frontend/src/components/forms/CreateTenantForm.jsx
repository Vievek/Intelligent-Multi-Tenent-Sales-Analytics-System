import React, { useState } from 'react';
import { Building2, Mail, Key } from 'lucide-react';

export default function CreateTenantForm({ onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [plan, setPlan] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Business name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (tenantCode && !/^[a-zA-Z0-9]{4,20}$/.test(tenantCode)) {
      newErrors.tenantCode = 'Code must be 4-20 alphanumeric characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({ name, email, tenantCode, plan });
      setName('');
      setEmail('');
      setTenantCode('');
      setPlan('basic');
      setErrors({});
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = () => {
    const randomCode = 'TEN' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setTenantCode(randomCode);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="business-name" className="input-label">
            Business Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              id="business-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input pl-10"
              placeholder="e.g. Acme Corp"
            />
          </div>
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="business-email" className="input-label">
            Admin Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              id="business-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="e.g. admin@acme.com"
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="tenant-code" className="input-label">
          Tenant Code (Unique identifier for agent registration)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              id="tenant-code"
              type="text"
              value={tenantCode}
              onChange={(e) => setTenantCode(e.target.value.toUpperCase())}
              className="input pl-10 font-mono text-primary-300"
              placeholder="e.g. ACMECORP"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateCode}
            className="btn-secondary whitespace-nowrap"
          >
            Auto Generate
          </button>
        </div>
        {errors.tenantCode && <p className="text-red-500 text-sm mt-1">{errors.tenantCode}</p>}
      </div>

      <div>
        <label htmlFor="plan" className="input-label">
          Plan
        </label>
        <select
          id="plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="input"
        >
          <option value="basic">Basic</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Creating...' : 'Create Tenant'}
        </button>
      </div>
    </form>
  );
}
