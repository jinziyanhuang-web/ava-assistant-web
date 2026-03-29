export function ensureArray(value) { return Array.isArray(value) ? value : []; }
export function hasTag(list, tag) { return ensureArray(list).includes(tag); }
export function intersection(listA, listB) { const b = new Set(ensureArray(listB)); return ensureArray(listA).filter(item => b.has(item)); }
export function countIntersection(listA, listB) { return intersection(listA, listB).length; }
export function daysBetween(dateA, dateB) {
  if (!dateA || !dateB) return Infinity;
  const a = new Date(dateA).getTime(); const b = new Date(dateB).getTime();
  return Math.floor(Math.abs(a - b) / 86400000);
}
export function formatDate(value) {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未记录';
  const y = date.getFullYear(); const m = `${date.getMonth() + 1}`.padStart(2,'0'); const d = `${date.getDate()}`.padStart(2,'0');
  return `${y}-${m}-${d}`;
}
export function formatDateTimeLocal(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}
export function mapCustomerCategoryTags(categoryTags = []) {
  const map = { '项链偏好': '项链', '耳钉偏好': '耳钉', '耳环偏好': '耳环', '手链偏好': '手链', '戒指偏好': '戒指', '礼盒偏好': '礼盒', '套装偏好': '套装' };
  return ensureArray(categoryTags).map(item => map[item]).filter(Boolean);
}
export function toggleTag(list = [], tag) { return hasTag(list, tag) ? list.filter(item => item !== tag) : [...list, tag]; }
export function genId(prefix='id') { return `${prefix}_${Math.random().toString(36).slice(2,10)}`; }
export function clone(value) { return JSON.parse(JSON.stringify(value)); }
export function summarizeRecommendation(customer, recommendations, currentMotive='') {
  if (!recommendations.length) return '';
  const top = recommendations[0];
  const color = (customer.colorTags || [])[0] || '经典';
  const style = (customer.styleTags || [])[0] || '精致';
  if (currentMotive) return `优先推${currentMotive}相关、${color}色系、偏${style}路线的款。先从 ${top.name} 开始最稳。`;
  return `优先推与客户主风格和预算更贴合的款，先从 ${top.name} 开始，再补 1-2 个备选。`;
}
