const { pendingReviewRepository } = require('../repositories/pendingReviewRepository');
const logger = require('../utils/logger');

/**
 * HTTP handler for /manageReviews
 *
 * GET    ?tenantId=&status=   — list reviews (default status=pending)
 * POST   /approve             — approve a review: body { reviewId, tenantId, correctedData }
 * POST   /reject              — reject a review:  body { reviewId, tenantId, reason? }
 */
async function reviewHandler(req, res) {
  const { method, query, body, path } = req;
  const tenantId = req.headers['x-tenant-id'] || query.tenantId || body?.tenantId;

  if (!tenantId) {
    return res.status(400).json({ error: 'Missing tenantId' });
  }

  try {
    if (method === 'GET') {
      const statusFilter = query.status || 'pending';
      const reviews = await pendingReviewRepository.findByTenant(tenantId, statusFilter);
      return res.status(200).json(reviews);
    }

    if (method === 'POST') {
      const action = query.action || (path || '').split('/').pop();

      if (action === 'approve') {
        const { reviewId, correctedData } = body;
        if (!reviewId || !correctedData) {
          return res.status(400).json({ error: 'Missing reviewId or correctedData' });
        }
        const result = await pendingReviewRepository.approve(tenantId, reviewId, correctedData);
        return res.status(200).json({ success: true, saleId: result.saleId });
      }

      if (action === 'reject') {
        const { reviewId, reason } = body;
        if (!reviewId) {
          return res.status(400).json({ error: 'Missing reviewId' });
        }
        await pendingReviewRepository.reject(tenantId, reviewId, reason);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action. Use ?action=approve or ?action=reject' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${method} Not Allowed` });
  } catch (error) {
    logger.error('Error in reviewHandler:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { reviewHandler };
