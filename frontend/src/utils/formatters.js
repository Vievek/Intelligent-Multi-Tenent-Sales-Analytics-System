import { format, parseISO, isValid } from 'date-fns';

export function formatCurrency(amount, currency = 'USD') {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date, formatStr = 'MMM dd, yyyy') {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : (date.toDate ? date.toDate() : new Date(date));
  if (!isValid(d)) return 'N/A';
  return format(d, formatStr);
}

export function formatDateTime(date) {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
}

export function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatCompactNumber(num) {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

export function getConfidenceColor(confidence) {
  const map = {
    HIGH: 'text-green-600 bg-green-50 border-green-200',
    MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    LOW: 'text-red-600 bg-red-50 border-red-200',
  };
  return map[confidence] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getConfidenceLabel(confidence) {
  const map = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };
  return map[confidence] || confidence;
}

export function getExtractionMethodLabel(method) {
  const map = {
    huggingface: 'HuggingFace BERT',
    gemini: 'Gemini 1.5 Flash',
  };
  return map[method] || method;
}

export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getStatusColor(status) {
  const map = {
    active: 'text-green-600 bg-green-50 border-green-200',
    inactive: 'text-red-600 bg-red-50 border-red-200',
    blocked: 'text-red-600 bg-red-50 border-red-200',
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  };
  return map[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}
