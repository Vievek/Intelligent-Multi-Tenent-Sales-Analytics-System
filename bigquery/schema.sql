-- BigQuery Schema for RMET Sales Analytics
-- Table: sales_analytics

CREATE TABLE IF NOT EXISTS `rmet-sales-analytics.analytics.sales_analytics` (
  sale_id STRING NOT NULL,
  tenant_id STRING NOT NULL,
  agent_id STRING NOT NULL,
  product STRING NOT NULL,
  quantity FLOAT64,
  price FLOAT64,
  total_value FLOAT64,
  date TIMESTAMP,
  confidence STRING,
  extraction_method STRING,
  raw_message STRING,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
)
PARTITION BY DATE(date)
CLUSTER BY tenant_id, product;

-- Sample Analytics Queries

-- Total sales by tenant
SELECT 
  tenant_id,
  COUNT(*) as total_sales,
  SUM(total_value) as total_revenue,
  AVG(total_value) as avg_sale_value
FROM `rmet-sales-analytics.analytics.sales_analytics`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY tenant_id
ORDER BY total_revenue DESC;

-- Top products by tenant
SELECT 
  tenant_id,
  product,
  COUNT(*) as sales_count,
  SUM(quantity) as total_quantity,
  SUM(total_value) as total_revenue
FROM `rmet-sales-analytics.analytics.sales_analytics`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY tenant_id, product
ORDER BY total_revenue DESC
LIMIT 10;

-- Agent performance
SELECT 
  tenant_id,
  agent_id,
  COUNT(*) as sales_count,
  SUM(total_value) as total_revenue,
  AVG(total_value) as avg_sale_value
FROM `rmet-sales-analytics.analytics.sales_analytics`
WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY tenant_id, agent_id
ORDER BY total_revenue DESC;

-- Extraction method accuracy
SELECT 
  extraction_method,
  COUNT(*) as total_extractions,
  COUNTIF(confidence = 'HIGH') as high_confidence,
  COUNTIF(confidence = 'MEDIUM') as medium_confidence,
  COUNTIF(confidence = 'LOW') as low_confidence
FROM `rmet-sales-analytics.analytics.sales_analytics`
GROUP BY extraction_method;
