export function generateScript(customer = {}, product = {}) {
  const scene = (customer.motiveTags && customer.motiveTags[0]) || '日常';
  const style = (customer.styleTags && customer.styleTags[0]) || '精致';
  const color = (product.colorTags && product.colorTags[0]) || '经典';
  if ((customer.motiveTags || []).includes('送礼') && product.giftSuitable) {
    return `最近这款做${scene}反馈很好，比较稳也不容易踩雷，我觉得挺适合你参考，要不要我拍细节给你看看？`;
  }
  return `我这边刚整理到一款很适合你平时${scene}的款，整体偏${style}风格，而且${color}系也比较衬气质，要不要我拍细节给你看看？`;
}
