import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CreateTenantForm from '../../src/components/forms/CreateTenantForm';

describe('CreateTenantForm', () => {
  it('renders all form fields', () => {
    render(<CreateTenantForm onSubmit={() => {}} onCancel={() => {}} />);

    expect(screen.getByLabelText(/Business Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Admin Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Tenant Code/i)).toBeDefined();
    expect(screen.getByLabelText(/Plan/i)).toBeDefined();
    expect(screen.getByText('Create Tenant')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('validates required fields', async () => {
    const handleSubmit = vi.fn();
    render(<CreateTenantForm onSubmit={handleSubmit} onCancel={() => {}} />);

    fireEvent.click(screen.getByText('Create Tenant'));

    await waitFor(() => {
      expect(screen.getByText('Business name is required')).toBeDefined();
      expect(screen.getByText('Email is required')).toBeDefined();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates email format', async () => {
    const handleSubmit = vi.fn();
    render(<CreateTenantForm onSubmit={handleSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Business Name/i), {
      target: { value: 'Test Business' },
    });
    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'invalid-email' },
    });
    fireEvent.click(screen.getByText('Create Tenant'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeDefined();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates tenant code format', async () => {
    const handleSubmit = vi.fn();
    render(<CreateTenantForm onSubmit={handleSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Business Name/i), {
      target: { value: 'Test Business' },
    });
    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Tenant Code/i), {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByText('Create Tenant'));

    await waitFor(() => {
      expect(screen.getByText('Code must be 4-20 alphanumeric characters')).toBeDefined();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue();
    render(<CreateTenantForm onSubmit={handleSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Business Name/i), {
      target: { value: 'Test Business' },
    });
    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Tenant Code/i), {
      target: { value: 'TEST123' },
    });
    fireEvent.click(screen.getByText('Create Tenant'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        name: 'Test Business',
        email: 'test@example.com',
        tenantCode: 'TEST123',
        plan: 'basic',
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(<CreateTenantForm onSubmit={() => {}} onCancel={handleCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(handleCancel).toHaveBeenCalled();
  });

  it('disables submit button while loading', async () => {
    const handleSubmit = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<CreateTenantForm onSubmit={handleSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/Business Name/i), {
      target: { value: 'Test Business' },
    });
    fireEvent.change(screen.getByLabelText(/Admin Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByText('Create Tenant'));

    expect(screen.getByText('Creating...')).toBeDefined();
  });
});
