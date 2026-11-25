import { ASSET_CARDS } from '../market-data.mjs';

const marketIds = [
  'M101', 'M102', 'M104', 'M106', 'M201', 'M202', 'M306',
  'M402', 'M404', 'M406', 'M501', 'M502', 'M503', 'M602',
  'M604', 'M606', 'M701', 'M702', 'M704', 'M706',
];
const marketKeys = new Map(marketIds.map(id => [id, `studio-market-${id}`]));
const commodityKeys = new Map(ASSET_CARDS.map(({id}) => [id, `town-invest-${id}`]));
const categoryCards = {stock:'IA001', property:'IB001', venture:'IC001', metal:'ID001', crypto:'IE006', forex:'IF001'};

export const studioMarketArt = id => marketKeys.get(id);
export const studioCommodityArt = id => commodityKeys.get(id);
export const marketTownCategoryArt = category => commodityKeys.get(categoryCards[category]);

const widths = [256, 512, 768];
const image = (id, width) => `/fufu-duel/assets/${commodityKeys.has(id) ? 'market-deck' : 'studio-cards'}/${id}-${width}.webp`;
export const studioCardDelivery = Object.fromEntries(
  [...marketKeys, ...commodityKeys].map(([id, key]) => [key, {
    sources: Object.fromEntries(widths.map(width => [width, image(id, width)])),
    thumb: image(id, widths[0]),
    landscape: true,
    aspect: commodityKeys.has(id) ? 2 : 1.5,
  }]),
);
