import {eventPrintFor} from './event-prints.mjs';
import {r163InvestmentArt,r163InvestmentCategoryArt} from './r163-investment-art.mjs';
import {studioCommodityArt,studioMarketArt,marketTownCategoryArt} from './studio-card-art.mjs';
import {r156EventArt} from './r156-event-art.mjs';
import {r148EventArt} from './r148-event-art.mjs';
import {r147EventArt} from './r147-event-art.mjs';
import {r146EventArt} from './r146-event-art.mjs';
import {r145EventArt} from './r145-event-art.mjs';
import {r144EventArt} from './r144-event-art.mjs';
import {r143EventArt} from './r143-event-art.mjs';
import {r142EventArt} from './r142-event-art.mjs';
import {r141EventArt} from './r141-event-art.mjs';
import {r140EventArt} from './r140-event-art.mjs';
import {r139EventArt} from './r139-event-art.mjs';
import {r138EventArt} from './r138-event-art.mjs';
import {r137EventArt} from './r137-event-art.mjs';
import {r136EventArt} from './r136-event-art.mjs';
import {r135EventArt} from './r135-event-art.mjs';
import {r133EventArt} from './r133-event-art.mjs';
import {r132EventArt} from './r132-event-art.mjs';
import {r131EventArt} from './r131-event-art.mjs';
import {r130EventArt} from './r130-event-art.mjs';
import {r129EventArt} from './r129-event-art.mjs';
import {r113InvestmentArt} from './r113-investment-art.mjs';
import {r109EventArt} from './r109-event-art.mjs';
import {r103EventArt} from './r103-event-art.mjs';
import {r102EventArt} from './r102-event-art.mjs';
import {r101EventArt} from './r101-event-art.mjs';
import {r100EventArt} from './r100-event-art.mjs';
import {r96EventArt} from './r96-event-art.mjs';
import {r91EventArt} from './r91-event-art.mjs';
import {r90EventArt} from './r90-event-art.mjs';
import {r89EventArt} from './r89-event-art.mjs';
import {r88EventArt} from './r88-event-art.mjs';
import {r87EventArt} from './r87-event-art.mjs';
import {r86EventArt} from './r86-event-art.mjs';
import {r81EventArt} from './r81-event-art.mjs';
import {r80EventArt} from './r80-event-art.mjs';
import {r79EventArt} from './r79-event-art.mjs';
import {r61InvestmentArt} from './r61-investment-art.mjs';
import {r74EventArt} from './r74-event-art.mjs';
import {prepareCardDelivery} from './r46-card-delivery.mjs';
import {r49EventArt} from './r49-event-art.mjs';
import {r51EventArt} from './r51-event-art.mjs';
import {r52EventArt} from './r52-event-art.mjs';
import {r54EventArt} from './r54-event-art.mjs';
import {r57EventArt} from './r57-event-art.mjs';
import {r45EventArt} from './r45-event-art.mjs';
import {r43EventArt} from './r43-event-art.mjs';
import {r42EventArt} from './r42-event-art.mjs';
import {r38EventArt} from './r38-event-art.mjs';
import {r37EventArt} from './r37-event-art.mjs';
import {r36EventArt} from './r36-event-art.mjs';
import {r35EventArt} from './r35-event-art.mjs';
import {r34EventArt} from './r34-event-art.mjs';
import {reviewedEventArt} from './r32-event-art.mjs';
// First review set: exact source-card matches, without changing card semantics.
const careers=['founder','freelancer','engineer','doctor','sales','assistant'];
export const careerArt=id=>careers.includes(id)?`/fufu-duel/assets/chibi-roles/career-${id}.webp`:null;
export const incomeArt=(id,variable=false)=>careers.includes(id)
  ? `/fufu-duel/assets/chibi-roles/${id}-${variable||!['assistant','doctor','engineer'].includes(id)?'variable':'fixed'}.webp` : null;
export const fateCardArt=id=>r156EventArt[id]||r148EventArt[id]||r147EventArt[id]||r146EventArt[id]||r145EventArt[id]||r144EventArt[id]||r143EventArt[id]||r142EventArt[id]||r141EventArt[id]||r140EventArt[id]||r139EventArt[id]||r138EventArt[id]||r137EventArt[id]||r136EventArt[id]||r135EventArt[id]||r133EventArt[id]||r132EventArt[id]||r131EventArt[id]||r130EventArt[id]||r129EventArt[id]||r109EventArt[id]||r103EventArt[id]||r102EventArt[id]||r101EventArt[id]||r100EventArt[id]||r96EventArt[id]||r91EventArt[id]||r90EventArt[id]||r89EventArt[id]||r88EventArt[id]||r87EventArt[id]||r86EventArt[id]||r81EventArt[id]||r80EventArt[id]||r79EventArt[id]||r74EventArt[id]||r57EventArt[id]||r54EventArt[id]||r52EventArt[id]||r51EventArt[id]||r49EventArt[id]||r45EventArt[id]||r43EventArt[id]||r42EventArt[id]||r37EventArt[id]||r36EventArt[id]||r35EventArt[id]||r34EventArt[id]||reviewedEventArt[id]||({JC001:'fate-JC001',DA005:'fate-DA005',DA049:'fate-DA049',DB040:'fate-DA049',L001:'lucky-L001'})[id]||(/^JC019(?:-[12])?$/.test(id)?'fate-JC019':/^JC020(?:-[12])?$/.test(id)?'fate-JC020':null)||eventPrintFor(id);
export const marketEventArt=id=>studioMarketArt(id)||r38EventArt[id]||r37EventArt[id]||r34EventArt[id]||null;
const studioInvestmentArt=Object.freeze({
  "IC004": "/fufu-duel/assets/r173-investment/investment-IC004.webp",
  "IC005": "/fufu-duel/assets/r173-investment/investment-IC005.webp"
});
export const investmentCardArt=offer=>offer.id?(studioCommodityArt(offer.id)||studioInvestmentArt[offer.id]||r163InvestmentArt[offer.id]||r113InvestmentArt[offer.id]||(offer.id==='IF009'?'investment-r72-IF009':null)||r61InvestmentArt[offer.id]||(['IA001','IB001','IC001','ID001','IE002','IF001'].includes(offer.id)?`investment-${offer.id}`:null)):(marketTownCategoryArt(offer.category)||r163InvestmentCategoryArt[offer.category]||(['stock','property','venture','metal','forex','crypto'].includes(offer.category)?`category-${offer.category}`:null));
export function setNativeCardArt(visual,key){
 if(!key)return visual;
 const path=key.startsWith('/') && /\.(webp|svg)$/.test(key) ? key : null,art=visual.querySelector('.topic-art');
 if(art&&!prepareCardDelivery(art,key)&&path){art.classList.add('r32-native');art.style.setProperty('background-image',`url("${path}")`,'important');art.style.setProperty('background-size','contain','important');art.style.setProperty('background-position','center','important');}
 visual.classList.add('native-card-art');return visual;
}
