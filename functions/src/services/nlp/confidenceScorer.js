class ConfidenceScorer {
  score(extraction) {
    let count = 0;
    
    if (extraction.product && extraction.product !== 'unknown' && extraction.product.length > 0) {
      count++;
    }
    
    if (extraction.quantity && extraction.quantity > 0 && !isNaN(extraction.quantity)) {
      count++;
    }
    
    if (extraction.price && extraction.price > 0 && !isNaN(extraction.price)) {
      count++;
    }

    if (count >= 3) return 'HIGH';
    if (count >= 2) return 'MEDIUM';
    return 'LOW';
  }
}

const confidenceScorer = new ConfidenceScorer();
module.exports = { confidenceScorer };