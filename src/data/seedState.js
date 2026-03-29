import { customersSeed } from './customers.js';
import { productsSeed } from './products.js';
import { clone, genId } from '../lib/helpers.js';

const followupsSeed = [
  { id: genId('fol'), customerId: 'C001', contactDate: '2026-03-25T09:00:00.000Z', contactMethod: '微信', content: '推荐了两款通勤耳钉，客户说月底看看', intentionLevel: 'medium', nextFollowupAt: '2026-03-31T10:00:00.000Z', createdAt: '2026-03-25T09:00:00.000Z' },
  { id: genId('fol'), customerId: 'C001', contactDate: '2026-03-18T19:00:00.000Z', contactMethod: '微信', content: '询问蓝色系项链库存和上身图', intentionLevel: 'high', nextFollowupAt: '2026-03-22T10:00:00.000Z', createdAt: '2026-03-18T19:00:00.000Z' },
  { id: genId('fol'), customerId: 'C003', contactDate: '2026-02-13T12:00:00.000Z', contactMethod: '微信', content: '男客户送礼，重点问了包装和寓意', intentionLevel: 'high', nextFollowupAt: '', createdAt: '2026-02-13T12:00:00.000Z' },
  { id: genId('fol'), customerId: 'C009', contactDate: '2025-11-20T10:00:00.000Z', contactMethod: '微信', content: '发了通勤项链合集，对方未及时回复', intentionLevel: 'low', nextFollowupAt: '2025-12-05T10:00:00.000Z', createdAt: '2025-11-20T10:00:00.000Z' }
];

const ordersSeed = [
  { id: genId('ord'), customerId: 'C001', productIds: ['P001'], orderDate: '2026-03-25T16:00:00.000Z', totalAmount: 899, purchasePurpose: '自用', note: '很喜欢蓝色系', createdAt: '2026-03-25T16:00:00.000Z' },
  { id: genId('ord'), customerId: 'C003', productIds: ['P007'], orderDate: '2026-03-22T18:00:00.000Z', totalAmount: 1299, purchasePurpose: '送礼', note: '纪念日购买', createdAt: '2026-03-22T18:00:00.000Z' },
  { id: genId('ord'), customerId: 'C004', productIds: ['P012'], orderDate: '2026-03-01T20:00:00.000Z', totalAmount: 1899, purchasePurpose: '自用', note: '偏爱高存在感套装', createdAt: '2026-03-01T20:00:00.000Z' },
  { id: genId('ord'), customerId: 'C010', productIds: ['P011'], orderDate: '2026-03-05T18:30:00.000Z', totalAmount: 559, purchasePurpose: '自用', note: '做耳钉加购', createdAt: '2026-03-05T18:30:00.000Z' }
];

function withMeta(list, type) {
  return list.map(item => ({ ...item, id: item.id || item.code || genId(type), createdAt: item.createdAt || new Date().toISOString(), updatedAt: item.updatedAt || new Date().toISOString() }));
}

export function buildInitialState() {
  return clone({
    customers: withMeta(customersSeed, 'cus'),
    products: withMeta(productsSeed, 'pro'),
    followups: withMeta(followupsSeed, 'fol'),
    orders: withMeta(ordersSeed, 'ord')
  });
}
