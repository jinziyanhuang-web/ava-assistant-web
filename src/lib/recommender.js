import { LEVEL_MAP } from './constants';
import { behaviorModifier, budgetScore, categoryScore, colorScore, motiveModifier, relationModifier, riskPenalty, sceneScore, styleScore } from './scoring';

function getLevel(score) {
  if (score >= 90) return LEVEL_MAP.STRONG;
  if (score >= 75) return LEVEL_MAP.MATCH;
  if (score >= 60) return LEVEL_MAP.BACKUP;
  return LEVEL_MAP.IGNORE;
}
export function getDisplayLimit(customer) {
  if ((customer.behaviorTags || []).includes('不喜欢被频繁打扰')) return 1;
  if ((customer.behaviorTags || []).includes('经常看不买')) return 2;
  return 3;
}
export function scoreProduct(customer, product, options = {}) {
  const reasons = []; const warnings = []; const currentMotive = options.currentMotive || '';
  let score = 0;
  score += styleScore(customer, product, reasons);
  score += colorScore(customer, product, reasons);
  score += sceneScore(customer, product, currentMotive, reasons);
  score += budgetScore(customer, product, reasons);
  score += categoryScore(customer, product, reasons);
  score += relationModifier(customer, product, reasons);
  score += motiveModifier(customer, product, currentMotive, reasons);
  score += behaviorModifier(customer, product, reasons);
  score -= riskPenalty(customer, product, warnings);
  return { ...product, score, level: getLevel(score), reasons: [...new Set(reasons)], warnings: [...new Set(warnings)] };
}
function conservativePick(products = []) {
  return [...products].sort((a, b) => Number(Boolean(b.isHot)) - Number(Boolean(a.isHot)) || (a.price || 0) - (b.price || 0)).slice(0, 2).map(item => ({ ...item, level: LEVEL_MAP.CONSERVATIVE, reasons: ['保守推荐'], warnings: [], score: 0 }));
}
export function recommendProducts(customer, products = [], options = {}) {
  const ranked = products.map(product => scoreProduct(customer, product, options)).filter(item => item.level !== LEVEL_MAP.IGNORE).sort((a, b) => b.score - a.score);
  return ranked.length ? ranked.slice(0, getDisplayLimit(customer)) : conservativePick(products);
}
