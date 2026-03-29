import { BUDGET_MAP } from './constants.js';
import { countIntersection, daysBetween, hasTag, mapCustomerCategoryTags } from './helpers.js';

export function styleScore(customer, product, reasons) {
  const matches = countIntersection(customer.styleTags, product.styleTags);
  let score = 0;
  if (matches > 0) { score += matches * 18; reasons.push('风格匹配'); } else { score -= 10; }
  const primary = (customer.styleTags || [])[0];
  if (primary && hasTag(product.styleTags, primary)) { score += 8; reasons.push('命中主风格'); }
  return score;
}
export function colorScore(customer, product, reasons) {
  const matches = countIntersection(customer.colorTags, product.colorTags);
  if (matches > 0) { reasons.push('颜色偏好一致'); return matches * 12; }
  return 0;
}
export function sceneScore(customer, product, currentMotive, reasons) {
  const motives = currentMotive ? [currentMotive] : (customer.motiveTags || []);
  const motiveToSceneMap = { '送礼': '送礼', '生日送礼': '生日礼物', '纪念日送礼': '纪念日礼物', '通勤佩戴': '通勤', '约会佩戴': '约会', '正式场合': '正式场合', '见家长': '见家长', '旅行拍照': '旅行拍照', '聚会佩戴': '聚会', '日常': '日常' };
  const scenes = motives.map(item => motiveToSceneMap[item]).filter(Boolean);
  if (!scenes.length) return 0;
  const hit = scenes.some(scene => hasTag(product.sceneTags, scene));
  if (hit) { reasons.push('命中当前场景'); return 32; }
  return 0;
}
export function budgetScore(customer, product, reasons) {
  const range = BUDGET_MAP[customer.budgetRange]; if (!range) return 0;
  const [min, max] = range; const price = Number(product.price || 0);
  if (price >= min && price <= max) { reasons.push('预算合适'); return 25; }
  if (Number.isFinite(max) && price > max && price <= max * 1.2) {
    if (hasTag(customer.relationTags, 'VIP客户') || customer.spendingLevel === 'high') return 8;
  }
  if (price > max) return -20;
  if (price < min) return 5;
  return 0;
}
export function categoryScore(customer, product, reasons) {
  let score = 0;
  const mapped = mapCustomerCategoryTags(customer.categoryTags);
  const hit = mapped.some(item => hasTag(product.categoryTags, item));
  if (hit) { score += 15; reasons.push('命中品类偏好'); }
  if (customer.lastPurchaseAt && hit && !hasTag(customer.motiveTags, '送礼')) {
    const days = daysBetween(customer.lastPurchaseAt, new Date());
    if (days <= 30) score -= 10;
  }
  return score;
}
export function relationModifier(customer, product, reasons) {
  let score = 0;
  if (hasTag(customer.relationTags, '新客户')) { if (hasTag(product.salesTags, '入门款')) score += 10; if (hasTag(product.salesTags, '安全款')) score += 12; if (hasTag(product.salesTags, '爆款')) score += 8; if (hasTag(product.salesTags, '高客单款')) score -= 8; }
  if (hasTag(customer.relationTags, '老客户')) { if (hasTag(product.salesTags, '适合搭配推荐')) score += 10; if (hasTag(product.salesTags, '可做加购')) score += 8; }
  if (hasTag(customer.relationTags, '沉睡客户')) { if (hasTag(product.salesTags, '爆款')) score += 10; if (hasTag(product.salesTags, '安全款')) score += 12; if (hasTag(product.salesTags, '高客单款')) score -= 12; }
  if (hasTag(customer.relationTags, 'VIP客户')) { if (hasTag(product.salesTags, '高客单款')) score += 15; if (hasTag(product.salesTags, '话题款')) score += 10; if (hasTag(product.categoryTags, '套装')) score += 10; if (hasTag(product.salesTags, '入门款')) score -= 6; }
  if (score > 0) reasons.push('客户阶段匹配');
  return score;
}
export function motiveModifier(customer, product, currentMotive, reasons) {
  let score = 0; const motives = currentMotive ? [currentMotive] : (customer.motiveTags || []);
  if (motives.includes('送礼')) { if (product.giftSuitable) score += 15; if (hasTag(product.salesTags, '安全款')) score += 12; if (hasTag(product.giftTags, '男客户易选')) score += 10; if (hasTag(product.giftTags, '寓意明确')) score += 8; if (hasTag(product.riskTags, '不适合送礼首推')) score -= 20; }
  if (motives.includes('生日送礼')) { if (hasTag(product.sceneTags, '生日礼物')) score += 15; if (hasTag(product.giftTags, '适合生日礼物')) score += 12; }
  if (motives.includes('纪念日送礼')) { if (hasTag(product.sceneTags, '纪念日礼物')) score += 15; if (hasTag(product.giftTags, '适合纪念日')) score += 12; if (hasTag(product.giftTags, '寓意明确')) score += 10; }
  if (motives.includes('通勤佩戴')) { if (hasTag(product.sceneTags, '通勤')) score += 15; if (hasTag(product.styleTags, '简约') || hasTag(product.styleTags, '低调') || hasTag(product.styleTags, '优雅')) score += 12; if (hasTag(product.riskTags, '挑穿搭')) score -= 10; }
  if (motives.includes('约会佩戴')) { if (hasTag(product.sceneTags, '约会')) score += 15; if (hasTag(product.styleTags, '精致') || hasTag(product.styleTags, '吸睛') || hasTag(product.styleTags, '华丽')) score += 12; if (hasTag(product.sceneTags, '拍照出片')) score += 8; }
  if (score > 0) reasons.push('当前动机匹配');
  return score;
}
export function behaviorModifier(customer, product, reasons) {
  let score = 0;
  if (hasTag(customer.behaviorTags, '决策快')) { if (hasTag(product.salesTags, '爆款')) score += 8; if (hasTag(product.salesTags, '可做主推')) score += 8; }
  if (hasTag(customer.behaviorTags, '爱犹豫')) { if (hasTag(product.salesTags, '安全款')) score += 10; if (hasTag(product.salesTags, '不易出错')) score += 10; if ((product.riskTags || []).length > 1) score -= 12; }
  if (hasTag(customer.behaviorTags, '经常看不买')) { if (hasTag(product.salesTags, '爆款')) score += 6; if (hasTag(product.salesTags, '节日重点款')) score += 8; if (hasTag(product.salesTags, '高客单款')) score -= 10; }
  if (hasTag(customer.behaviorTags, '喜欢活动优惠')) { if (hasTag(product.salesTags, '节日重点款')) score += 8; if (hasTag(product.salesTags, '入门款')) score += 6; }
  if (hasTag(customer.behaviorTags, '喜欢看上身图') && hasTag(product.riskTags, '上身更好看')) score += 8;
  if (score > 0) reasons.push('行为特征匹配');
  return score;
}
export function riskPenalty(customer, product, warnings) {
  let score = 0;
  if (hasTag(product.riskTags, '挑肤色')) { score += 10; warnings.push('产品较挑肤色'); }
  if (hasTag(product.riskTags, '挑穿搭')) { score += 10; warnings.push('产品较挑穿搭'); }
  if (hasTag(product.riskTags, '库存不稳')) { score += 15; warnings.push('当前库存不稳'); }
  if (hasTag(product.riskTags, '尺寸需确认')) { score += 12; warnings.push('推荐前需确认尺寸'); }
  if (hasTag(product.riskTags, '实物偏闪') && hasTag(customer.styleTags, '低调')) { score += 10; warnings.push('客户偏低调，产品实物更闪'); }
  if (hasTag(product.riskTags, '实物偏秀气') && hasTag(customer.styleTags, '吸睛')) { score += 8; warnings.push('客户偏存在感风格，产品更秀气'); }
  return score;
}
