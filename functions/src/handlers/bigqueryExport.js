const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('../utils/logger');

let bigquery = null;
let bigqueryInitialized = false;

function getBigQueryClient() {
  if (bigqueryInitialized) {
    return bigquery;
  }

  const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.FIRESTORE_EMULATOR_HOST;
  if (isEmulator) {
    logger.info('BigQuery client disabled in local emulator mode.');
    bigqueryInitialized = true;
    bigquery = null;
    return null;
  }

  try {
    const { BigQuery } = require('@google-cloud/bigquery');
    bigquery = new BigQuery();
  } catch (err) {
    logger.warn('BigQuery client unavailable — exports will be skipped.', { error: err.message });
    bigquery = null;
  }
  bigqueryInitialized = true;
  return bigquery;
}

const DATASET_ID = 'analytics';
const TABLE_ID = 'sales_analytics';

exports.exportSaleToBigQuery = onDocumentCreated(
  'tenants/{tenantId}/sales/{saleId}',
  async (event) => {
    const bq = getBigQueryClient();
    if (!bq) {
      logger.warn('BigQuery not initialized — skipping export', {
        tenantId: event.params.tenantId,
        saleId: event.params.saleId,
      });
      return;
    }
    const data = event.data.data();
    const tenantId = event.params.tenantId;
    const saleId = event.params.saleId;
    try {
      const row = {
        sale_id: saleId,
        tenant_id: tenantId,
        agent_id: data.agentId || '',
        product: data.product || '',
        quantity: data.quantity || 0,
        price: data.price || 0,
        total_value: data.totalValue || 0,
        date: data.date ? (data.date.toDate ? data.date.toDate() : new Date(data.date)) : new Date(),
        confidence: data.confidence || 'LOW',
        extraction_method: data.extractionMethod || 'gemini',
        raw_message: data.rawMessage || '',
        processed_at: data.processedAt ? new Date(data.processedAt) : new Date(),
        created_at: new Date(),
      };
      await bq.dataset(DATASET_ID).table(TABLE_ID).insert([row]);
      logger.info('Exported sale to BigQuery', { saleId, tenantId });
    } catch (error) {
      logger.error('Failed to export sale to BigQuery', { saleId, tenantId, error: error.message });
      throw error;
    }
  }
);

exports.aggregateDailySales = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'UTC',
    retryConfig: { retryCount: 3, maxRetryDuration: '1h', minBackoffDuration: '1m' },
  },
  async () => {
    const bq = getBigQueryClient();
    if (!bq) {
      logger.warn('BigQuery not initialized — skipping daily aggregation');
      return;
    }
    const queryStr = `
      INSERT INTO \`${DATASET_ID}.daily_sales_aggregation\`
      (date, tenant_id, total_sales, total_revenue, total_quantity)
      SELECT DATE(date) as date, tenant_id, COUNT(*) as total_sales,
             SUM(total_value) as total_revenue, SUM(quantity) as total_quantity
      FROM \`${DATASET_ID}.sales_analytics\`
      WHERE DATE(date) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY date, tenant_id
    `;
    try {
      await bq.query({ query: queryStr });
      logger.info('Daily sales aggregation completed');
    } catch (error) {
      logger.error('Daily sales aggregation failed:', { error: error.message });
      throw error;
    }
  }
);
