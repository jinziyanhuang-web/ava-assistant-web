import { ensureArray } from './helpers.js';

function isValidDateString(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}
function isValidISOString(value) {
  if (!value) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}
function validateTagLimit(list, max, label) {
  if (ensureArray(list).length > max) return `${label}最多选择${max}个`;
  return '';
}
export function validateCustomerForm(form = {}) {
  if (!String(form.name || '').trim()) return '请填写客户姓名';
  if (!form.budgetRange) return '请选择预算区间';
  if (!form.ageRange) return '请选择年龄段';
  if (!isValidDateString(form.birthday)) return '生日格式应为 YYYY-MM-DD';
  return [
    validateTagLimit(form.relationTags, 2, '关系标签'),
    validateTagLimit(form.styleTags, 3, '风格标签'),
    validateTagLimit(form.colorTags, 3, '颜色标签'),
    validateTagLimit(form.behaviorTags, 4, '行为特征'),
    validateTagLimit(form.valueTags, 2, '维护价值')
  ].find(Boolean) || '';
}
export function validateProductForm(form = {}) {
  if (!String(form.name || '').trim()) return '请填写产品名称';
  if (!String(form.sku || '').trim()) return '请填写SKU';
  if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) return '价格必须大于0';
  if (ensureArray(form.categoryTags).length < 1) return '至少选择1个品类标签';
  if (ensureArray(form.styleTags).length < 1) return '至少选择1个风格标签';
  if (ensureArray(form.sceneTags).length < 1) return '至少选择1个场景标签';
  return [
    validateTagLimit(form.styleTags, 4, '风格标签'),
    validateTagLimit(form.sceneTags, 5, '场景标签'),
    validateTagLimit(form.salesTags, 4, '销售标签'),
    validateTagLimit(form.riskTags, 3, '风险标签')
  ].find(Boolean) || '';
}
export function validateFollowupForm(form = {}) {
  if (!String(form.contactMethod || '').trim()) return '请选择联系方式';
  if (!String(form.content || '').trim()) return '请填写跟进内容';
  if (String(form.content || '').trim().length < 6) return '跟进内容至少填写6个字';
  if (!['high', 'medium', 'low'].includes(form.intentionLevel)) return '请选择正确的意向等级';
  if (!isValidISOString(form.contactDate)) return '联系时间格式不正确';
  if (!isValidISOString(form.nextFollowupAt)) return '下次提醒时间格式不正确';
  return '';
}
