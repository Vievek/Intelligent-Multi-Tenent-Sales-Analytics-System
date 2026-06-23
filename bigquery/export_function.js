const admin = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');
const functions = require('firebase-functions/v2');
const logger = require('../functions/src/utils/logger');

const bigquery = new BigQuery();
const DATASET_ID = 'analytics';
const TABLE_ID = 'sales_analytics';

// Cloud Function to export Firestore sales to BigQuery
// Triggered by Firestore write events
exports.exportSaleToBigQuery = functions.firestore.onDocumentCreated(
  'tenants/{tenantId}/sales/{saleId}',
  async (event) => {
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
        date: data.date ? new Date(data.date) : new Date(),
        confidence: data.confidence || 'LOW',
        extraction_method: data.extractionMethod || 'gemini',
        raw_message: data.rawMessage || '',
        processed_at: data.processedAt ? new Date(data.processedAt) : new Date(),
        created_at: new Date(),
      };

      await bigquery
        .dataset(DATASET_ID)
        .table(TABLE_ID)
        .insert([row]);

      logger.info('Exported sale to BigQuery', { saleId, tenantId });
    } catch (error) {
      logger.error('Failed to export sale to BigQuery', { saleId, tenantId, error: error.message });
      throw error;
    }
  }
);

// Scheduled function to aggregate daily sales
exports.aggregateDailySales = functions.scheduler.onSchedule(
  {
    schedule: '0 0 * * *', // Daily at midnight
    timeZone: 'UTC',
    retryConfig: {
      retryCount: 3,
      maxRetryDuration: '1h',
      minBackoffDuration: '1m',
    },
  },
  async () => {
    const query = `
      INSERT INTO \`${DATASET_ID}.daily_sales_aggregation\`
      (date, tenant_id, total_sales, total_revenue, total_quantity)
      SELECT
        DATE(date) as date,
        tenant_id,
        COUNT(*) as total_sales,
        SUM(total_value) as total_revenue,
        SUM(quantity) as total_quantity
      FROM \`${DATASET_ID}.sales_analytics\`
      WHERE DATE(date) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      GROUP BY date, tenant_id
    `;

    try {
      await bigquery.query({ query });
      logger.info('Daily sales aggregation completed');
    } catch (error) {
      logger.error('Daily sales aggregation failed:', error);
      throw error;
    }
  }
);
