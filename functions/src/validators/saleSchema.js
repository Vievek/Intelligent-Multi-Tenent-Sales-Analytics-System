const { z } = require('zod');

const saleSchema = z.object({
  product: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name too long'),
  
  quantity: z.number()
    .positive('Quantity must be greater than 0')
    .max(1000000, 'Quantity too large'),
  
  price: z.number()
    .positive('Price must be greater than 0')
    .max(100000000, 'Price too large'),
  
  date: z.union([
    z.string().or(z.date()).or(z.timestamp())
  ]),
  
  rawMessage: z.string()
    .min(1, 'Raw message is required')
    .max(4096, 'Message too long'),
  
  agentId: z.string()
    .min(1, 'Agent ID is required'),
  
  tenantId: z.string()
    .min(1, 'Tenant ID is required'),
  
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW'])
    .default('LOW'),
  
  extractionMethod: z.enum(['huggingface', 'gemini'])
    .default('gemini'),
  
  processedAt: z.string().optional(),
  pubsubMessageId: z.string().nullable().optional(),
}).strict();

const createTenantSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100),
  email: z.string().email('Invalid email format').max(200),
  tenantCode: z.string().min(4, 'Tenant code must be at least 4 characters').max(20),
  plan: z.enum(['basic', 'pro']).default('basic'),
});

const agentRegistrationSchema = z.object({
  telegramUserId: z.string().min(1),
  chatId: z.number().positive(),
  tenantCode: z.string().min(1),
});

const messageSchema = z.object({
  telegramUserId: z.string().min(1),
  tenantId: z.string().min(1),
  agentId: z.string().min(1),
  text: z.string().min(1).max(4096),
  timestamp: z.number().positive().optional(),
  receivedAt: z.string().optional(),
});

module.exports = {
  saleSchema,
  createTenantSchema,
  agentRegistrationSchema,
  messageSchema,
};