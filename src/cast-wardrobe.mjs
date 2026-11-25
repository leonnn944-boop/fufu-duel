// sRGB swatches for the second copy of each printed career. Names match both
// editions of the GLBs. Only these cloth, leather and hat materials may change.
export const secondWardrobe = {
  assistant: {
    // Pale mint office cardigan, forest lapels and a warm oatmeal skirt.
    assistant3:'#91BA92', assistant4:'#416D55', assistant5:'#755342',
    'assistant trousers':'#AA967A', 'assistant lapel':'#65906C', 'peach hem':'#607E61'
  },
  doctor: {
    // Cornflower scrubs, an ivory pocket and midnight-blue work shoes.
    doctor3:'#557EAA', doctor4:'#E1DCC1', doctor5:'#425568',
    'doctor trousers':'#465873', apron:'#B2CADD', 'teal rubber':'#344F61'
  },
  engineer: {
    // Denimy indigo and ink cuffs retain the blue silhouette above sand chinos.
    engineer3:'#536E99', engineer4:'#344568', engineer5:'#AD7551',
    'engineer trousers':'#9E876E'
  },
  founder: {
    // A lighter cinnabar double-breasted suit with dark-red cuffs and ivory felt.
    founder3:'#C4584C', founder4:'#873D36', founder5:'#765346',
    'founder trousers':'#806959', 'bow knot':'#C09258', 'Felt tan':'#CBB491',
    'Honey felt':'#ECDBB6', 'Hat ribbon':'#873F40', 'founder lapel':'#9D433E'
  },
  freelancer: {
    // Sunlit apricot smock, blue-grey stripes, and a burnt-sienna beret.
    freelancer3:'#E8A064', freelancer4:'#BD6636', freelancer5:'#7C5849',
    'freelancer trousers':'#72614C', linen:'#627885', 'Beret plum':'#9C492E'
  },
  sales: {
    // Wisteria swing coat over plum trousers, with muted gold at the cuffs.
    sales3:'#AE88C3', sales4:'#E5D3AF', sales5:'#685064',
    'sales trousers':'#665471', juniper:'#87659A', 'sales lapel':'#7E5892'
  }
};

export function wearsSecondWardrobe(players, player) {
  // RoomEngine assigns the original career once during the A–L draw.
  // Later employment cards change the income pool, not this career id.
  const role = player.career?.id;
  return Boolean(role && players.some(other => other.seat < player.seat && other.career?.id === role));
}

const materialPrefix = 'Vinyl Market ';

export function dressSecondFigure(body, career) {
  const palette = secondWardrobe[career];
  if (!palette) return;
  const owned = new Map();
  for (const renderer of body.findComponents('render')) {
    for (const mesh of renderer.meshInstances) {
      const source = mesh.material;
      if (!source?.name.startsWith(materialPrefix)) continue;
      const color = palette[source.name.slice(materialPrefix.length)];
      if (!color) continue;
      let variant = owned.get(source);
      if (!variant) {
        variant = source.clone();
        variant.diffuse.fromString(color);
        variant.update();
        owned.set(source, variant);
      }
      mesh.material = variant;
    }
  }
  body.once('destroy', () => {
    for (const variant of owned.values()) variant.destroy();
  });
}
