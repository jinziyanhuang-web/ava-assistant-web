import { CUSTOMER_FORM_OPTIONS, FOLLOWUP_FORM_OPTIONS, PRODUCT_FORM_OPTIONS, STORAGE_KEY } from './lib/constants.js';
import { buildInitialState } from './data/seedState.js';
import { clone, formatDate, formatDateTimeLocal, genId, summarizeRecommendation, toggleTag } from './lib/helpers.js';
import { recommendProducts } from './lib/recommender.js';
import { generateScript } from './lib/scriptGenerator.js';
import { validateCustomerForm, validateFollowupForm, validateProductForm } from './lib/validators.js';

const root = document.getElementById('root');
const importInput = document.createElement('input');
importInput.type = 'file';
importInput.accept = 'application/json';
importInput.style.display = 'none';
document.body.appendChild(importInput);

let state = loadState();
let ui = {
  customerKeyword: '',
  customerFilter: 'all',
  productKeyword: '',
  productFilter: 'all',
  recommendationCustomerId: '',
  recommendationMotive: '',
  recommendations: [],
  recommendationSummary: '',
  error: '',
  notice: ''
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : buildInitialState();
  } catch {
    return buildInitialState();
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentRoute() { return (location.hash.replace(/^#\/?/, '') || 'home').split('/'); }
function go(route) { location.hash = route; }
function clearMessages() { ui.error = ''; ui.notice = ''; }
function setNotice(message) { ui.notice = message; ui.error = ''; render(); }
function setError(message) { ui.error = message; ui.notice = ''; render(); }
function footer(current) {
  const tabs = [['home', '首页'], ['customers', '客户'], ['recommendation', '推荐'], ['products', '产品']];
  return `<footer class="footer-nav">${tabs.map(([key, label]) => `<button class="tab-item ${current===key?'tab-on':''}" data-go="${key}">${label}</button>`).join('')}</footer>`;
}
function shell(title, body, current='') {
  const message = ui.error ? `<div class="message error-box">${escapeHtml(ui.error)}</div>` : ui.notice ? `<div class="message notice-box">${escapeHtml(ui.notice)}</div>` : '';
  return `<div class="app-shell"><header class="topbar">${title}</header><main class="page-body">${message}${body}</main>${current ? footer(current) : ''}</div>`;
}
function card(inner, cls='') { return `<section class="card ${cls}">${inner}</section>`; }
function tags(list, cls='') { return `<div class="tag-row">${(list||[]).map(item => `<button type="button" class="tag ${cls}">${escapeHtml(item)}</button>`).join('')}</div>`; }
function activeTags(field, options, selected) {
  return `<div class="tag-row">${options.map(item => `<button type="button" class="tag ${(selected||[]).includes(item)?'tag-on':''}" data-toggle="${field}" data-tag="${encodeURIComponent(item)}">${escapeHtml(item)}</button>`).join('')}</div>`;
}
function inputField(label, inner, required=false) { return `<div class="field"><div class="field-label ${required?'required':''}">${label}</div>${inner}</div>`; }
function optionHtml(options, value, placeholder='请选择') {
  const start = `<option value="">${placeholder}</option>`;
  return start + options.map(item => {
    const val = typeof item === 'string' ? item : item.value;
    const lab = typeof item === 'string' ? item : item.label;
    return `<option value="${escapeAttr(val)}" ${value===val?'selected':''}>${escapeHtml(lab)}</option>`;
  }).join('');
}
function dashboardPage() {
  const customers = state.customers.filter(x => x.status === 'active');
  const dueFollowups = state.followups.filter(x => x.nextFollowupAt && new Date(x.nextFollowupAt) <= new Date()).length;
  const inactiveCustomers = customers.filter(x => !x.lastContactAt || new Date(x.lastContactAt) < new Date(Date.now() - 7 * 86400000)).length;
  const birthdayCustomers = customers.filter(x => x.birthday && new Date(x.birthday).getMonth() === new Date().getMonth()).length;
  const focusCustomers = customers.filter(x => (x.valueTags || []).includes('重点维护')).length;
  const recentOrders = [...state.orders].sort((a,b)=> new Date(b.orderDate)-new Date(a.orderDate)).slice(0,5);
  return shell('首页',
    card(`<div class="hero-mark">Ava的专属助理</div><div class="hero-title">今天先做最值得做的事</div><div class="hero-sub">优先跟进、精准推荐、稳步复购，把注意力放在最有转化价值的客户身上。</div><div class="stats-grid"><div class="stat strong"><div class="stat-label">待跟进</div><div class="stat-value">${dueFollowups}</div></div><div class="stat"><div class="stat-label">沉睡客户</div><div class="stat-value">${inactiveCustomers}</div></div><div class="stat"><div class="stat-label">生日提醒</div><div class="stat-value">${birthdayCustomers}</div></div><div class="stat"><div class="stat-label">重点客户</div><div class="stat-value">${focusCustomers}</div></div></div>`, 'hero-card') +
    card(`<h2 class="section-title">今日建议</h2><div class="list-line">先处理 ${dueFollowups} 位待跟进客户，避免错过成交窗口。</div><div class="list-line">查看 ${birthdayCustomers} 位生日提醒客户，适合先做礼物型推荐。</div><div class="list-line no-border">从重点客户中优先做推荐，今天至少完成 3 组精准触达。</div>`) +
    `<div class="section-hint">工作入口</div>` +
    card(`<button class="card-link" data-go="customers"><div class="entry-title">客户管理</div><div class="entry-sub">查看客户标签、偏好、跟进进度</div></button>`) +
    card(`<button class="card-link" data-go="recommendation"><div class="entry-title">推荐中心</div><div class="entry-sub">按预算、风格、场景生成精准推荐</div></button>`) +
    card(`<button class="card-link" data-go="products"><div class="entry-title">产品库</div><div class="entry-sub">维护产品资料、销售标签和风险提示</div></button>`) +
    card(`<button class="card-link" data-go="settings"><div class="entry-title">数据管理</div><div class="entry-sub">清空示例、重置示例、导入导出你的长期客户数据</div></button>`) +
    card(`<h2 class="section-title">最近成交</h2>${recentOrders.length ? recentOrders.map((order, idx) => `<div class="order-item ${idx===recentOrders.length-1?'no-border':''}"><div class="order-line">${formatDate(order.orderDate)} · ￥${order.totalAmount || 0}</div><div class="order-sub">${escapeHtml(order.purchasePurpose || '未填写用途')}${order.note ? ` · ${escapeHtml(order.note)}` : ''}</div></div>`).join('') : `<div class="empty">暂无成交记录</div>`}`), 'home');
}
function customersPage() {
  const all = state.customers.filter(x => x.status === 'active');
  let customers = [...all];
  const k = ui.customerKeyword.trim().toLowerCase();
  if (k) customers = customers.filter(item => [item.name, item.wechatName, ...(item.styleTags||[]), ...(item.relationTags||[]), ...(item.valueTags||[])].join(' ').toLowerCase().includes(k));
  if (ui.customerFilter==='vip') customers = customers.filter(i => (i.relationTags||[]).includes('VIP客户'));
  if (ui.customerFilter==='focus') customers = customers.filter(i => (i.valueTags||[]).includes('重点维护'));
  if (ui.customerFilter==='sleep') customers = customers.filter(i => (i.relationTags||[]).includes('沉睡客户'));
  const stats = { total: all.length, vip: all.filter(i => (i.relationTags||[]).includes('VIP客户')).length, sleep: all.filter(i => (i.relationTags||[]).includes('沉睡客户')).length };
  return shell('客户管理',
    card(`<h2 class="section-title">客户管理</h2><div class="hero-sub">把时间优先留给值得重点跟进的人。</div><div class="three-stats"><div class="mini-stat"><div class="mini-value">${stats.total}</div><div class="mini-label">全部客户</div></div><div class="mini-stat"><div class="mini-value">${stats.vip}</div><div class="mini-label">VIP</div></div><div class="mini-stat"><div class="mini-value">${stats.sleep}</div><div class="mini-label">沉睡客户</div></div></div>`, 'hero-card') +
    card(`<div class="search-row"><input class="input search-input" placeholder="搜索客户名 / 标签 / 微信名" value="${escapeAttr(ui.customerKeyword)}" data-bind="customerKeyword"><button class="btn-primary search-btn">搜索</button></div><div class="filter-row">${[['all','全部'],['focus','重点维护'],['vip','VIP'],['sleep','沉睡客户']].map(([k2,l]) => `<button class="tag ${ui.customerFilter===k2?'tag-on':''}" data-set-filter="customer:${k2}">${l}</button>`).join('')}</div><button class="btn-secondary" data-go="customer-form">新增客户</button>`) +
    (customers.length ? customers.map(item => card(`<button class="card-link" data-go="customer-detail/${item.id}"><div class="row between start"><div><div class="item-name">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.wechatName || '未填写微信名')} · 累计消费 ￥${item.totalSpent || 0}</div></div><div class="budget-pill">${escapeHtml(item.budgetRange || '未填预算')}</div></div><div class="tag-row">${(item.valueTags||[]).includes('重点维护')?'<button class="tag tag-on">重点维护</button>':''}${item.lastContactAt?`<button class="tag">最近联系 ${formatDate(item.lastContactAt)}</button>`:''}</div>${tags(item.relationTags)}${tags(item.styleTags, 'tag-soft')}</button>`)).join('') : card('<div class="empty">暂无符合条件的客户</div>')), 'customers');
}
function customerDetailPage(id) {
  const customer = state.customers.find(i => i.id === id);
  if (!customer) return shell('客户详情', card('<div class="empty">客户信息不存在</div>'));
  const followups = state.followups.filter(i => i.customerId === id).sort((a,b)=> new Date(b.contactDate)-new Date(a.contactDate)).slice(0,5);
  const orders = state.orders.filter(i => i.customerId === id).sort((a,b)=> new Date(b.orderDate)-new Date(a.orderDate)).slice(0,5);
  return shell('客户详情',
    card(`<div class="row between start"><div><div class="detail-name">${escapeHtml(customer.name)}</div><div class="detail-sub">${escapeHtml(customer.wechatName || '未填写微信名')}</div></div><div class="budget-pill">${escapeHtml(customer.budgetRange || '未填预算')}</div></div><div class="meta-line">年龄段：${escapeHtml(customer.ageRange || '未填写')}</div><div class="meta-line">生日：${escapeHtml(customer.birthday || '未填写')}</div><div class="meta-line">累计消费：￥${customer.totalSpent || 0}</div><div class="meta-line">最近联系：${formatDate(customer.lastContactAt)}</div><div class="meta-line">最近购买：${formatDate(customer.lastPurchaseAt)}</div><div class="action-row"><button class="btn-primary" data-go="recommendation/${customer.id}">去做推荐</button><button class="btn-secondary" data-go="followup-form/${customer.id}">新增跟进</button></div><div class="action-row"><button class="btn-secondary" data-go="customer-form/${customer.id}">编辑客户</button><button class="btn-danger" data-delete="customer:${customer.id}">删除客户</button></div>`) +
    card(`<h2 class="section-title">标签与偏好</h2><div class="group-title">关系标签</div>${tags(customer.relationTags)}<div class="group-title">动机标签</div>${tags(customer.motiveTags)}<div class="group-title">风格/颜色</div>${tags([...(customer.styleTags||[]), ...(customer.colorTags||[])])}<div class="group-title">行为特征</div>${tags(customer.behaviorTags)}${customer.note?`<div class="group-title">备注</div><div class="note-box">${escapeHtml(customer.note)}</div>`:''}`) +
    card(`<h2 class="section-title">最近跟进</h2>${followups.length ? followups.map((item,idx)=> `<div class="list-item ${idx===followups.length-1?'no-border':''}"><div class="list-head"><span>${formatDate(item.contactDate)}</span><span class="muted">${{high:'高意向',medium:'中意向',low:'低意向'}[item.intentionLevel] || '未标记'}</span></div><div class="list-sub">${escapeHtml(item.contactMethod || '未记录方式')}</div><div class="list-body">${escapeHtml(item.content || '无内容')}</div><div class="inline-actions"><button class="mini-btn danger" data-delete="followup:${item.id}">删除跟进</button></div></div>`).join('') : `<div class="empty">暂无跟进记录</div>`}`) +
    card(`<h2 class="section-title">最近购买</h2>${orders.length ? orders.map((item,idx)=> `<div class="list-item ${idx===orders.length-1?'no-border':''}"><div class="list-head"><span>${formatDate(item.orderDate)}</span><span class="muted">￥${item.totalAmount || 0}</span></div><div class="list-sub">用途：${escapeHtml(item.purchasePurpose || '未填写')}</div><div class="list-body">${escapeHtml(item.note || '无备注')}</div></div>`).join('') : `<div class="empty">暂无购买记录</div>`}`));
}
function customerFormPage(id) {
  const detail = state.customers.find(i => i.id === id);
  const form = detail ? clone({ name:'', wechatName:'', ageRange:'', birthday:'', budgetRange:'', spendingLevel:'medium', totalSpent:0, relationTags:[], motiveTags:[], styleTags:[], colorTags:[], categoryTags:[], behaviorTags:[], valueTags:[], note:'', status:'active', ...detail }) : { name:'', wechatName:'', ageRange:'', birthday:'', budgetRange:'', spendingLevel:'medium', totalSpent:0, relationTags:[], motiveTags:[], styleTags:[], colorTags:[], categoryTags:[], behaviorTags:[], valueTags:[], note:'', status:'active' };
  window.__form = form; window.__formType = 'customer'; window.__formId = id || '';
  return shell(id ? '编辑客户' : '新增客户',
    card(`<h2 class="section-title">${id ? '编辑客户' : '新增客户'}</h2><div class="form-tip">基础信息尽量完整，后面的推荐会更准。</div>${inputField('姓名', `<input class="input" maxlength="20" value="${escapeAttr(form.name)}" data-form-field="name" placeholder="例如：林小姐">`, true)}${inputField('微信名/备注名', `<input class="input" maxlength="30" value="${escapeAttr(form.wechatName)}" data-form-field="wechatName" placeholder="例如：Lin">`)}${inputField('生日', `<input class="input" value="${escapeAttr(form.birthday)}" data-form-field="birthday" placeholder="YYYY-MM-DD">`)}${inputField('累计消费', `<input class="input" type="number" value="${escapeAttr(String(form.totalSpent||0))}" data-form-field="totalSpent" placeholder="0">`)}${inputField('年龄段', `<select class="input" data-form-field="ageRange">${optionHtml(CUSTOMER_FORM_OPTIONS.ageRanges, form.ageRange, '请选择年龄段')}</select>`, true)}${inputField('预算区间', `<select class="input" data-form-field="budgetRange">${optionHtml(CUSTOMER_FORM_OPTIONS.budgetRanges, form.budgetRange, '请选择预算区间')}</select>`, true)}${inputField('消费等级', `<select class="input" data-form-field="spendingLevel">${optionHtml(CUSTOMER_FORM_OPTIONS.spendingLevels, form.spendingLevel, '请选择消费等级')}</select>`)}`) +
    card(`<h2 class="section-title">标签</h2><div class="form-tip">建议按常用判断填写，不必一次填满。</div>${tagGroup('关系标签（最多2个）','relationTags',CUSTOMER_FORM_OPTIONS.relationTags, form.relationTags)}${tagGroup('动机标签','motiveTags',CUSTOMER_FORM_OPTIONS.motiveTags, form.motiveTags)}${tagGroup('风格标签（最多3个）','styleTags',CUSTOMER_FORM_OPTIONS.styleTags, form.styleTags)}${tagGroup('颜色标签（最多3个）','colorTags',CUSTOMER_FORM_OPTIONS.colorTags, form.colorTags)}${tagGroup('品类偏好','categoryTags',CUSTOMER_FORM_OPTIONS.categoryTags, form.categoryTags)}${tagGroup('行为特征（最多4个）','behaviorTags',CUSTOMER_FORM_OPTIONS.behaviorTags, form.behaviorTags)}${tagGroup('维护价值（最多2个）','valueTags',CUSTOMER_FORM_OPTIONS.valueTags, form.valueTags)}`) +
    card(inputField('备注', `<textarea class="textarea" maxlength="300" data-form-field="note" placeholder="补充客户偏好、送礼对象、沟通习惯等">${escapeHtml(form.note)}</textarea>`)) +
    `<button class="btn-primary" data-save="customer">保存客户</button>`);
}
function recommendationPage(customerId='') {
  ui.recommendationCustomerId = customerId || ui.recommendationCustomerId || '';
  const customers = state.customers.filter(i => i.status === 'active');
  const customer = customers.find(i => i.id === ui.recommendationCustomerId);
  return shell('推荐中心',
    card(`<h2 class="section-title">推荐中心</h2><div class="form-tip">先选客户，再决定本次推荐动机。系统会按标签、预算、阶段和风险自动给出建议。</div>${inputField('选择客户', `<select class="input" data-ui-field="recommendationCustomerId">${optionHtml(customers.map(c => ({ value: c.id, label: `${c.name} / ${c.wechatName || '未填写微信名'}` })), ui.recommendationCustomerId, '请选择客户')}</select>`)}${inputField('本次推荐动机（可选）', `<select class="input" data-ui-field="recommendationMotive">${optionHtml(CUSTOMER_FORM_OPTIONS.motiveTags, ui.recommendationMotive, '不选则按客户标签推荐')}</select>`)}<button class="btn-primary" data-generate="recommendation">生成推荐</button>`) +
    (customer ? card(`<h2 class="section-title">客户摘要</h2><div class="summary-name">${escapeHtml(customer.name)} / ${escapeHtml(customer.wechatName || '未填写微信名')}</div><div class="summary-text">预算：${escapeHtml(customer.budgetRange || '未填写')} · 消费等级：${escapeHtml(customer.spendingLevel || '未填写')}</div>${tags(customer.styleTags)}${tags(customer.motiveTags, 'tag-soft')}`) : '') +
    (ui.recommendationSummary ? card(`<h2 class="section-title">本次建议</h2><div class="strategy-text">${escapeHtml(ui.recommendationSummary)}</div>`, 'strategy-card') : '') +
    (ui.recommendations.length ? ui.recommendations.map(item => card(`<div class="row between start"><div><div class="item-name">${escapeHtml(item.name)}</div><div class="summary-text">${item.score}分 · ${item.levelText} · ￥${item.price}</div></div><div class="level-badge">${item.levelText}</div></div><div class="group-title">推荐理由</div>${tags(item.reasons)}${item.warnings?.length ? `<div class="group-title warning">提醒</div>${item.warnings.map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join('')}` : ''}<div class="group-title">推荐话术</div><div class="script-box">${escapeHtml(item.script)}</div><button class="btn-secondary" data-copy="${encodeURIComponent(item.script)}">复制话术</button>`, `result-card level-${item.level}`)).join('') : (ui.recommendationCustomerId ? card('<div class="empty">点击“生成推荐”后，这里会显示推荐结果。</div>') : '')), 'recommendation');
}
function productsPage() {
  const all = state.products.filter(i => i.status === 'active');
  let products = [...all];
  const k = ui.productKeyword.trim().toLowerCase();
  if (k) products = products.filter(item => [item.name, item.sku, ...(item.categoryTags||[]), ...(item.styleTags||[])].join(' ').toLowerCase().includes(k));
  if (ui.productFilter==='hot') products = products.filter(i => i.isHot);
  if (ui.productFilter==='gift') products = products.filter(i => i.giftSuitable);
  if (ui.productFilter==='premium') products = products.filter(i => (i.salesTags||[]).includes('高客单款'));
  const stats = { total: all.length, hot: all.filter(i=>i.isHot).length, gift: all.filter(i=>i.giftSuitable).length };
  return shell('产品库',
    card(`<h2 class="section-title">产品库</h2><div class="hero-sub">把产品标签维护准确，推荐才会稳定且像“专门为她挑的”。</div><div class="three-stats"><div class="mini-stat"><div class="mini-value">${stats.total}</div><div class="mini-label">全部产品</div></div><div class="mini-stat"><div class="mini-value">${stats.hot}</div><div class="mini-label">爆款</div></div><div class="mini-stat"><div class="mini-value">${stats.gift}</div><div class="mini-label">适合送礼</div></div></div>`, 'hero-card') +
    card(`<div class="search-row"><input class="input search-input" placeholder="搜索产品名 / SKU / 标签" value="${escapeAttr(ui.productKeyword)}" data-bind="productKeyword"><button class="btn-primary search-btn">搜索</button></div><div class="filter-row">${[['all','全部'],['hot','爆款'],['gift','送礼'],['premium','高客单']].map(([k2,l]) => `<button class="tag ${ui.productFilter===k2?'tag-on':''}" data-set-filter="product:${k2}">${l}</button>`).join('')}</div><button class="btn-primary" data-go="product-form">新增产品</button>`) +
    (products.length ? products.map(item => card(`<div class="row between start"><button class="card-link flex-1" data-go="product-form/${item.id}"><div class="row between start"><div><div class="item-name">${escapeHtml(item.name)}</div><div class="item-sub">${escapeHtml(item.sku || '未填写SKU')}</div></div><div class="price-text">￥${item.price || 0}</div></div><div class="tag-row">${item.isHot?'<button class="tag tag-on">爆款</button>':''}<button class="tag tag-soft">${item.giftSuitable ? '适合送礼' : '偏自用'}</button><button class="tag">${item.stockStatus === 'available' ? '有货' : '状态待确认'}</button></div>${tags(item.categoryTags)}${tags(item.styleTags, 'tag-soft')}${tags(item.salesTags, 'tag-warn')}${item.description ? `<div class="desc">${escapeHtml(item.description)}</div>` : ''}</button><div class="inline-actions right"><button class="mini-btn danger" data-delete="product:${item.id}">删除</button></div></div>`)).join('') : card('<div class="empty">暂无符合条件的产品</div>')), 'products');
}
function productFormPage(id) {
  const detail = state.products.find(i => i.id === id);
  const form = detail ? clone({ name:'', sku:'', price:'', stockStatus:'available', isHot:false, giftSuitable:false, categoryTags:[], styleTags:[], colorTags:[], sceneTags:[], salesTags:[], giftTags:[], riskTags:[], description:'', status:'active', ...detail }) : { name:'', sku:'', price:'', stockStatus:'available', isHot:false, giftSuitable:false, categoryTags:[], styleTags:[], colorTags:[], sceneTags:[], salesTags:[], giftTags:[], riskTags:[], description:'', status:'active' };
  window.__form = form; window.__formType = 'product'; window.__formId = id || '';
  return shell(id ? '编辑产品' : '新增产品',
    card(`<h2 class="section-title">${id ? '编辑产品' : '新增产品'}</h2><div class="form-tip">先把品类、风格、场景填准，推荐结果会更稳定。</div>${inputField('产品名称', `<input class="input" value="${escapeAttr(form.name)}" data-form-field="name" placeholder="例如：经典蓝天鹅项链">`, true)}${inputField('SKU', `<input class="input" value="${escapeAttr(form.sku)}" data-form-field="sku" placeholder="例如：SWN-001">`, true)}${inputField('价格', `<input class="input" type="number" value="${escapeAttr(String(form.price || ''))}" data-form-field="price" placeholder="请输入价格">`, true)}<label class="switch-line"><span>是否爆款</span><input type="checkbox" data-form-check="isHot" ${form.isHot ? 'checked' : ''}></label><label class="switch-line"><span>是否适合送礼</span><input type="checkbox" data-form-check="giftSuitable" ${form.giftSuitable ? 'checked' : ''}></label>`) +
    card(`${tagGroup('品类标签（至少1个）','categoryTags',PRODUCT_FORM_OPTIONS.categoryTags, form.categoryTags)}${tagGroup('风格标签（1-4个）','styleTags',PRODUCT_FORM_OPTIONS.styleTags, form.styleTags)}${tagGroup('颜色标签','colorTags',PRODUCT_FORM_OPTIONS.colorTags, form.colorTags)}${tagGroup('场景标签（1-5个）','sceneTags',PRODUCT_FORM_OPTIONS.sceneTags, form.sceneTags)}${tagGroup('销售标签','salesTags',PRODUCT_FORM_OPTIONS.salesTags, form.salesTags)}${tagGroup('送礼标签','giftTags',PRODUCT_FORM_OPTIONS.giftTags, form.giftTags)}${tagGroup('风险标签（最多3个）','riskTags',PRODUCT_FORM_OPTIONS.riskTags, form.riskTags)}`) +
    card(inputField('描述', `<textarea class="textarea" maxlength="300" data-form-field="description" placeholder="补充产品卖点、适合场景、注意事项等">${escapeHtml(form.description)}</textarea>`)) +
    `<button class="btn-primary" data-save="product">保存产品</button>`);
}
function followupFormPage(customerId) {
  const customer = state.customers.find(i => i.id === customerId);
  const form = { contactDate: formatDateTimeLocal(), contactMethod:'微信', content:'', intentionLevel:'medium', nextFollowupAt:'' };
  window.__form = form; window.__formType = 'followup'; window.__formId = customerId || '';
  return shell('新增跟进',
    card(`<h2 class="section-title">新增跟进</h2><div class="form-tip">记录这次沟通内容，系统后面会更准确地提醒你何时再次联系。</div>${customer ? `<div class="summary-box"><div class="summary-name">${escapeHtml(customer.name)} / ${escapeHtml(customer.wechatName || '未填写微信名')}</div><div class="summary-text">预算：${escapeHtml(customer.budgetRange || '未填写')} · 标签：${escapeHtml((customer.styleTags || []).join(' / ') || '未填写')}</div></div>` : ''}`, 'hero-card') +
    card(`${inputField('联系时间', `<input class="input" type="datetime-local" value="${escapeAttr(form.contactDate)}" data-form-field="contactDate">`)}${inputField('联系方式', `<select class="input" data-form-field="contactMethod">${optionHtml(FOLLOWUP_FORM_OPTIONS.contactMethods, form.contactMethod, '请选择联系方式')}</select>`)}${inputField('意向等级', `<select class="input" data-form-field="intentionLevel">${optionHtml(FOLLOWUP_FORM_OPTIONS.intentionLevels, form.intentionLevel, '请选择意向等级')}</select>`)}${inputField('下次提醒时间', `<input class="input" type="datetime-local" value="${escapeAttr(form.nextFollowupAt)}" data-form-field="nextFollowupAt">`)}<div class="tag-row">${FOLLOWUP_FORM_OPTIONS.quickNextDays.map(day => `<button class="tag" data-quick-day="${day}">${day}天后提醒</button>`).join('')}</div>`) +
    card(`${inputField('跟进内容', `<textarea class="textarea" maxlength="500" data-form-field="content" placeholder="建议写清：客户看了什么、反馈如何、你下一步准备怎么跟。"></textarea>`)}<div class="count-text"><span id="followup-count">0</span> / 500</div>`) +
    `<button class="btn-primary" data-save="followup">保存跟进</button>`);
}
function settingsPage() {
  const stats = {
    customers: state.customers.filter(i => i.status === 'active').length,
    products: state.products.filter(i => i.status === 'active').length,
    followups: state.followups.length,
    orders: state.orders.length
  };
  const lastSaved = localStorage.getItem(STORAGE_KEY) ? '已保存在当前浏览器' : '当前还没有本地数据';
  return shell('数据管理',
    card(`<h2 class="section-title">长期使用建议</h2><div class="form-tip">你现在录入、编辑、删除的客户和产品数据，都会保存在当前浏览器里。建议定期导出备份，避免换手机或清缓存后丢失。</div><div class="three-stats"><div class="mini-stat"><div class="mini-value">${stats.customers}</div><div class="mini-label">客户</div></div><div class="mini-stat"><div class="mini-value">${stats.products}</div><div class="mini-label">产品</div></div><div class="mini-stat"><div class="mini-value">${stats.followups}</div><div class="mini-label">跟进</div></div></div><div class="meta-line">${lastSaved}</div>`, 'hero-card') +
    card(`<h2 class="section-title">数据备份</h2><div class="action-stack"><button class="btn-primary" data-export="json">导出全部数据备份</button><button class="btn-secondary" data-import="json">导入备份文件</button></div><div class="form-tip mt8">导出后会下载一个 JSON 文件，建议你保存到电脑或云盘。导入时会覆盖当前网站里的全部本地数据。</div>`) +
    card(`<h2 class="section-title">示例数据</h2><div class="action-stack"><button class="btn-secondary" data-reset="seed">恢复示例数据</button><button class="btn-danger" data-clear="all">清空全部数据</button></div><div class="form-tip mt8">如果你准备正式录入自己的客户，建议先导出一份当前数据，再清空示例数据开始使用。</div>`) +
    card(`<h2 class="section-title">使用提示</h2><div class="list-line">删除客户时，会同步删除该客户的跟进记录和订单记录。</div><div class="list-line">删除产品不会删除历史订单，只会从产品库中移除。</div><div class="list-line no-border">如果你长期使用，建议每次大改数据前先导出一份备份。</div>`), 'home');
}
function tagGroup(title, field, all, active) { return `<div class="tag-group"><div class="group-title">${title}</div>${activeTags(field, all, active)}</div>`; }
function escapeHtml(text='') { return String(text).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function escapeAttr(text='') { return escapeHtml(text); }
function render() {
  const [page, id] = currentRoute();
  let html = '';
  if (page === 'home') html = dashboardPage();
  else if (page === 'customers') html = customersPage();
  else if (page === 'customer-detail') html = customerDetailPage(id);
  else if (page === 'customer-form') html = customerFormPage(id);
  else if (page === 'recommendation') html = recommendationPage(id);
  else if (page === 'products') html = productsPage();
  else if (page === 'product-form') html = productFormPage(id);
  else if (page === 'followup-form') html = followupFormPage(id);
  else if (page === 'settings') html = settingsPage();
  else html = dashboardPage();
  root.innerHTML = html;
}
function saveCustomer() {
  const form = window.__form; const id = window.__formId || '';
  const cleaned = { ...form, name: String(form.name || '').trim(), wechatName: String(form.wechatName || '').trim(), note: String(form.note || '').trim(), totalSpent: Number(form.totalSpent || 0) };
  const msg = validateCustomerForm(cleaned);
  if (msg) return setError(msg);
  clearMessages();
  const now = new Date().toISOString();
  if (id) state.customers = state.customers.map(item => item.id === id ? { ...item, ...cleaned, updatedAt: now } : item);
  else state.customers.unshift({ ...cleaned, id: genId('cus'), code: `C${String(state.customers.length + 1).padStart(3,'0')}`, createdAt: now, updatedAt: now });
  saveState();
  setNotice(id ? '客户已更新' : '客户已新增');
  go(id ? `customer-detail/${id}` : 'customers');
}
function saveProduct() {
  const form = window.__form; const id = window.__formId || '';
  const cleaned = { ...form, name: String(form.name || '').trim(), sku: String(form.sku || '').trim(), description: String(form.description || '').trim(), price: Number(form.price || 0) };
  const msg = validateProductForm(cleaned);
  if (msg) return setError(msg);
  clearMessages();
  const now = new Date().toISOString();
  if (id) state.products = state.products.map(item => item.id === id ? { ...item, ...cleaned, updatedAt: now } : item);
  else state.products.unshift({ ...cleaned, id: genId('pro'), code: `P${String(state.products.length + 1).padStart(3,'0')}`, createdAt: now, updatedAt: now });
  saveState();
  setNotice(id ? '产品已更新' : '产品已新增');
  go('products');
}
function saveFollowup() {
  const form = window.__form; const customerId = window.__formId || '';
  const msg = validateFollowupForm(form);
  if (msg) return setError(msg);
  clearMessages();
  const now = new Date().toISOString();
  state.followups.unshift({ ...form, id: genId('fol'), customerId, createdAt: now, updatedAt: now });
  state.customers = state.customers.map(item => item.id === customerId ? { ...item, lastContactAt: form.contactDate, updatedAt: now } : item);
  saveState();
  setNotice('跟进已保存');
  go(customerId ? `customer-detail/${customerId}` : 'customers');
}
function generateRecommendation() {
  const customer = state.customers.find(i => i.id === ui.recommendationCustomerId);
  if (!customer) return setError('请先选择客户');
  clearMessages();
  const recommendations = recommendProducts(customer, state.products.filter(i => i.status === 'active'), { currentMotive: ui.recommendationMotive }).map(item => ({
    ...item,
    levelText: { strong:'强推荐', match:'可推荐', backup:'备选', conservative:'保守推荐' }[item.level] || '推荐',
    script: generateScript({ ...customer, motiveTags: ui.recommendationMotive ? [ui.recommendationMotive] : customer.motiveTags }, item)
  }));
  ui.recommendations = recommendations;
  ui.recommendationSummary = summarizeRecommendation(customer, recommendations, ui.recommendationMotive);
  render();
}
function deleteCustomer(id) {
  const customer = state.customers.find(item => item.id === id);
  if (!customer) return;
  if (!window.confirm(`确定删除客户“${customer.name}”吗？这会同时删除她的跟进和订单记录。`)) return;
  state.customers = state.customers.filter(item => item.id !== id);
  state.followups = state.followups.filter(item => item.customerId !== id);
  state.orders = state.orders.filter(item => item.customerId !== id);
  saveState();
  ui.recommendations = [];
  ui.recommendationSummary = '';
  setNotice('客户已删除');
  go('customers');
}
function deleteProduct(id) {
  const product = state.products.find(item => item.id === id);
  if (!product) return;
  if (!window.confirm(`确定删除产品“${product.name}”吗？`)) return;
  state.products = state.products.filter(item => item.id !== id);
  saveState();
  ui.recommendations = [];
  ui.recommendationSummary = '';
  setNotice('产品已删除');
  go('products');
}
function deleteFollowup(id) {
  const followup = state.followups.find(item => item.id === id);
  if (!followup) return;
  if (!window.confirm('确定删除这条跟进记录吗？')) return;
  state.followups = state.followups.filter(item => item.id !== id);
  saveState();
  setNotice('跟进记录已删除');
  render();
}
function resetSeedData() {
  if (!window.confirm('确定恢复示例数据吗？这会覆盖你当前浏览器里的所有本地数据。')) return;
  state = buildInitialState();
  saveState();
  ui.recommendations = [];
  ui.recommendationSummary = '';
  setNotice('示例数据已恢复');
  go('home');
}
function clearAllData() {
  if (!window.confirm('确定清空全部数据吗？清空后客户、产品、跟进、订单都会被移除。')) return;
  state = { customers: [], products: [], followups: [], orders: [] };
  saveState();
  ui.recommendations = [];
  ui.recommendationSummary = '';
  setNotice('全部数据已清空');
  go('home');
}
function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 'ava-assistant-web-v2',
    data: state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ava-assistant-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setNotice('数据备份已导出');
}
function openImport() { importInput.value = ''; importInput.click(); }
function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || '{}'));
      const nextState = parsed.data || parsed;
      if (!Array.isArray(nextState.customers) || !Array.isArray(nextState.products) || !Array.isArray(nextState.followups) || !Array.isArray(nextState.orders)) {
        throw new Error('格式不正确');
      }
      if (!window.confirm('导入会覆盖当前浏览器里的全部本地数据，确定继续吗？')) return;
      state = clone(nextState);
      saveState();
      ui.recommendations = [];
      ui.recommendationSummary = '';
      setNotice('数据导入成功');
      go('home');
    } catch {
      setError('导入失败：请确认选择的是本站导出的 JSON 备份文件');
    }
  };
  reader.readAsText(file, 'utf-8');
}

window.addEventListener('hashchange', render);
importInput.addEventListener('change', e => importData(e.target.files?.[0]));

document.addEventListener('input', e => {
  const bind = e.target.dataset.bind;
  if (bind) { ui[bind] = e.target.value; return render(); }
  const field = e.target.dataset.formField;
  if (field && window.__form) {
    window.__form[field] = e.target.value;
    if (field === 'content') {
      const el = document.getElementById('followup-count');
      if (el) el.textContent = e.target.value.length;
    }
  }
});

document.addEventListener('change', e => {
  const field = e.target.dataset.formField;
  if (field && window.__form) window.__form[field] = e.target.value;
  const check = e.target.dataset.formCheck;
  if (check && window.__form) window.__form[check] = e.target.checked;
  const uiField = e.target.dataset.uiField;
  if (uiField) { ui[uiField] = e.target.value; render(); }
});

document.addEventListener('click', e => {
  const goTarget = e.target.closest('[data-go]')?.dataset.go;
  if (goTarget) return go(goTarget);
  const filterTarget = e.target.closest('[data-set-filter]')?.dataset.setFilter;
  if (filterTarget) {
    const [type, value] = filterTarget.split(':');
    if (type==='customer') ui.customerFilter = value;
    if (type==='product') ui.productFilter = value;
    return render();
  }
  const toggle = e.target.closest('[data-toggle]');
  if (toggle && window.__form) {
    const field = toggle.dataset.toggle;
    const tag = decodeURIComponent(toggle.dataset.tag);
    window.__form[field] = toggleTag(window.__form[field], tag);
    return render();
  }
  const del = e.target.closest('[data-delete]')?.dataset.delete;
  if (del) {
    const [type, id] = del.split(':');
    if (type === 'customer') return deleteCustomer(id);
    if (type === 'product') return deleteProduct(id);
    if (type === 'followup') return deleteFollowup(id);
  }
  if (e.target.closest('[data-save="customer"]')) return saveCustomer();
  if (e.target.closest('[data-save="product"]')) return saveProduct();
  if (e.target.closest('[data-save="followup"]')) return saveFollowup();
  if (e.target.closest('[data-generate="recommendation"]')) return generateRecommendation();
  const quick = e.target.closest('[data-quick-day]')?.dataset.quickDay;
  if (quick && window.__form) {
    window.__form.nextFollowupAt = formatDateTimeLocal(new Date(Date.now() + Number(quick) * 86400000));
    return render();
  }
  const copy = e.target.closest('[data-copy]')?.dataset.copy;
  if (copy) return navigator.clipboard?.writeText(decodeURIComponent(copy)).then(() => setNotice('话术已复制')).catch(() => setNotice('已尝试复制，请手动长按复制'));
  if (e.target.closest('[data-reset="seed"]')) return resetSeedData();
  if (e.target.closest('[data-clear="all"]')) return clearAllData();
  if (e.target.closest('[data-export="json"]')) return exportData();
  if (e.target.closest('[data-import="json"]')) return openImport();
});

render();
