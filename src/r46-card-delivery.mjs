import {r189DeliveryAssets} from './r189-delivery-assets.mjs';
import {eventPrintDelivery} from './event-prints.mjs';
import {r156DeliveryAssets} from './r156-delivery-assets.mjs';
import {studioCardDelivery} from './studio-card-art.mjs';
import {r148DeliveryAssets} from './r148-delivery-assets.mjs';
import {r146DeliveryAssets} from './r146-delivery-assets.mjs';
import {r145DeliveryAssets} from './r145-delivery-assets.mjs';
import {r144DeliveryAssets} from './r144-delivery-assets.mjs';
import {r143DeliveryAssets} from './r143-delivery-assets.mjs';
import {r142DeliveryAssets} from './r142-delivery-assets.mjs';
import {r141DeliveryAssets} from './r141-delivery-assets.mjs';
import {r140DeliveryAssets} from './r140-delivery-assets.mjs';
import {r139DeliveryAssets} from './r139-delivery-assets.mjs';
import {r138DeliveryAssets} from './r138-delivery-assets.mjs';
import {r137DeliveryAssets} from './r137-delivery-assets.mjs';
import {r136DeliveryAssets} from './r136-delivery-assets.mjs';
import {r135DeliveryAssets} from './r135-delivery-assets.mjs';
import {r132DeliveryAssets} from './r132-delivery-assets.mjs';
import {r131DeliveryAssets} from './r131-delivery-assets.mjs';
import {r130DeliveryAssets} from './r130-delivery-assets.mjs';
import {r129DeliveryAssets} from './r129-delivery-assets.mjs';
import {r113DeliveryAssets} from './r113-delivery-assets.mjs';
import {r109DeliveryAssets} from './r109-delivery-assets.mjs';
import {r103DeliveryAssets} from './r103-delivery-assets.mjs';
import {r102DeliveryAssets} from './r102-delivery-assets.mjs';
import {r101DeliveryAssets} from './r101-delivery-assets.mjs';
import {r100DeliveryAssets} from './r100-delivery-assets.mjs';
import {r96DeliveryAssets} from './r96-delivery-assets.mjs';
import {r91DeliveryAssets} from './r91-delivery-assets.mjs';
import {r90DeliveryAssets} from './r90-delivery-assets.mjs';
import {r89DeliveryAssets} from './r89-delivery-assets.mjs';
import {r88DeliveryAssets} from './r88-delivery-assets.mjs';
import {r87DeliveryAssets} from './r87-delivery-assets.mjs';
import {r86DeliveryAssets} from './r86-delivery-assets.mjs';
import {r61DeliveryAssets} from './r61-delivery-assets.mjs';
import {r46DeliveryAssets} from './r46-delivery-assets.mjs';
import {r49DeliveryAssets} from './r49-delivery-assets.mjs';
import {r51DeliveryAssets} from './r51-delivery-assets.mjs';
import {r52DeliveryAssets} from './r52-delivery-assets.mjs';
import {r54DeliveryAssets} from './r54-delivery-assets.mjs';
import {r57DeliveryAssets} from './r57-delivery-assets.mjs';
const deliveryAssets={...r156DeliveryAssets,...r148DeliveryAssets,...r146DeliveryAssets,...r145DeliveryAssets,...r144DeliveryAssets,...r143DeliveryAssets,...r142DeliveryAssets,...r141DeliveryAssets,...r140DeliveryAssets,...r139DeliveryAssets,...r138DeliveryAssets,...r137DeliveryAssets,...r136DeliveryAssets,...r135DeliveryAssets,...r132DeliveryAssets,...r131DeliveryAssets,...r130DeliveryAssets,...r129DeliveryAssets,...r113DeliveryAssets,...r109DeliveryAssets,...r103DeliveryAssets,...r102DeliveryAssets,...r101DeliveryAssets,...r100DeliveryAssets,...r96DeliveryAssets,...r91DeliveryAssets,...r90DeliveryAssets,...r89DeliveryAssets,...r88DeliveryAssets,...r87DeliveryAssets,...r86DeliveryAssets,...r46DeliveryAssets,...r49DeliveryAssets,...r51DeliveryAssets,...r52DeliveryAssets,...r54DeliveryAssets,...r57DeliveryAssets,...r61DeliveryAssets};

// Exact reviewed illustration keys use responsive delivery variants.
export const cardDeliveryAsset = key => r189DeliveryAssets[key] || studioCardDelivery[key] || deliveryAssets[key] || eventPrintDelivery[key];
export function prepareCardDelivery(art,key){
  if(!cardDeliveryAsset(key))return false;
  art.dataset.deliveryKey=key;
  art.classList.add('r32-native','delivery-art');
  art.style.setProperty('background-image','none','important');
  return true;
}

export function mountCardDelivery(host){
  for(const art of host.querySelectorAll('[data-delivery-key]')){
    if(art.dataset.deliveryMounted)continue;
    art.dataset.deliveryMounted='true';
    const asset=cardDeliveryAsset(art.dataset.deliveryKey),mini=art.classList.contains('hand-event-art');
    const ratio=window.devicePixelRatio;
    const size=asset.landscape&&!mini
      ? (art.clientWidth*ratio>512?768:art.clientWidth*ratio>256?512:256)
      : (ratio>2?768:ratio>1?512:256);
    const src=mini?asset.thumb:(art.closest('.investment')&&asset.offerSources?asset.offerSources[size]:asset.sources[size]);
    if(!mini)art.removeAttribute('aria-hidden');
    const img=document.createElement('img'),status=document.createElement('span');
    img.alt='';img.decoding='async';img.width=mini?96:size;img.height=mini?96:asset.landscape?Math.round(size/(asset.aspect||1.5)):size;
    status.className='delivery-status';
    if(!mini)status.setAttribute('role','status');
    else status.setAttribute('aria-hidden','true');
    art.replaceChildren(img,status);
    const load=()=>{
      art.dataset.deliveryState='loading';
      status.replaceChildren(document.createTextNode(mini?'…':'圖片載入中'));
      const attempt=String(Number(art.dataset.deliveryAttempt||0)+1);
      art.dataset.deliveryAttempt=attempt;
      img.onload=async()=>{
        try{
          await img.decode();
          if(art.dataset.deliveryAttempt!==attempt)return;
          if(!img.naturalWidth)throw new Error('empty image');
          art.dataset.deliveryState='loaded';status.replaceChildren();
        }catch{failed();}
      };
      const failed=()=>{
        if(art.dataset.deliveryAttempt!==attempt)return;
        art.dataset.deliveryState='error';
        status.textContent=mini?'◇':'圖片暫時無法顯示';
        if(!mini){const retry=document.createElement('button');retry.type='button';retry.className='delivery-retry';retry.textContent='重試圖片';retry.onclick=event=>{event.stopPropagation();img.removeAttribute('src');load();};status.append(retry);}
      };
      img.onerror=failed;img.src=src;
    };
    load();
  }
}
