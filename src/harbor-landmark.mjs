// An original working waterfront for the Vancouver harbor tile.
// Geometry is batched by the existing landmark builder. Units are local to the tile.
const colors = Object.freeze({
  sea: '#236a7d',
  shallow: '#428d95',
  waterLight: '#7db9b8',
  stone: '#aeb8a8',
  sand: '#e1cdaa',
  timber: '#ac8663',
  dark: '#274b55',
  metal: '#4c7580',
  glass: '#79bfc0',
  clear: '#acd9cd',
  ivory: '#f5ead0',
  brass: '#d5a257',
  ochre: '#af7945',
  rust: '#b56852',
  leaf: '#759d81',
});

function arc(radius, rise, height, z, angle) {
  return [Math.cos(angle) * radius - .47, height + Math.sin(angle) * rise, z];
}

function makeTerminal(builder) {
  const c = colors;
  builder.box('terminal raised stone plinth', [-.47, .24, -.47], [.96, .13, .7], c.stone);
  builder.box('continuous terminal boarding floor', [-.47, .32, -.46], [.92, .06, .62], c.sand);
  builder.gable('terminal rear canopy gable', -.47, .76, -.76, .88, .22, .12, c.sand);
  builder.box('terminal glass concourse', [-.47, .54, -.50], [.78, .41, .43], c.metal);
  for (const x of [-.78, -.62, -.47, -.32, -.16]) {
    builder.box('separate terminal glazed bays', [x, .56, -.277], [.125, .27, .012], c.glass);
    builder.box('terminal window transom', [x, .575, -.267], [.128, .015, .016], c.clear);
  }
  builder.box('terminal recessed boarding entrance', [-.47, .46, -.254], [.19, .255, .027], c.dark);
  builder.box('terminal glass door leaf', [-.424, .464, -.237], [.069, .205, .018], c.clear);
  builder.box('boarding door pull', [-.442, .45, -.223], [.012, .077, .019], c.brass);
  for (const side of [-1, 1]) {
    const x = -.47 + side * .45;
    for (const z of [-.77, -.53, -.265, -.14]) {
      builder.box('canopy slender square columns', [x, .55, z], [.047, .45, .047], c.ivory);
      builder.box('column stone pedestal', [x, .32, z], [.08, .08, .08], c.stone);
    }
    builder.beam('terminal roof fascia', [x, .80, -.85], [x, .80, -.12], .045, c.ivory);
  }
  for (let segment = 0; segment < 20; segment++) {
    const a = segment * Math.PI / 20;
    const next = (segment + 1) * Math.PI / 20;
    const front = z => [arc(.463, .30, .78, z, a), arc(.463, .30, .78, z, next)];
    const [rearA, rearB] = front(-.86);
    const [frontA, frontB] = front(-.10);
    const skylight = segment >= 7 && segment <= 12;
    builder.quad(rearA, rearB, frontB, frontA, skylight ? c.clear : c.metal);
    for (const z of [-.86, -.62, -.38, -.10]) {
      builder.quad(
        arc(.469, .304, .781, z - .008, a), arc(.469, .304, .781, z + .008, a),
        arc(.469, .304, .781, z + .008, next), arc(.469, .304, .781, z - .008, next),
        c.ivory,
      );
    }
  }
  builder.features.push('arched terminal roof ribs');
  for (const segment of [0, 4, 7, 13, 16, 20]) {
    const a = segment * Math.PI / 20;
    builder.beam('roof glazing longitudinal seams', arc(.469, .306, .783, -.86, a), arc(.469, .306, .783, -.10, a), .014, c.ivory);
  }
  for (const x of [-.88, -.13]) {
    builder.box('boarding-area bench', [x, .391, -.118], [.15, .035, .10], c.timber);
    builder.box('boarding-area bench leg', [x, .359, -.118], [.022, .047, .085], c.dark);
  }
}

function container(builder, x, y, z, color, width = .31) {
  const frame = color === colors.brass ? colors.ochre : colors.dark;
  builder.box('freight container shell', [x, y, z], [width, .15, .17], color);
  for (const side of [-1, 1]) {
    for (let rib = -3; rib <= 3; rib++) {
      const center = x + rib * width / 8;
      const edge = z + side * .086;
      const ridge = z + side * .096;
      const bottom = y - .061;
      const top = y + .061;
      builder.quad([center - .008, bottom, edge], [center, bottom, ridge], [center, top, ridge], [center - .008, top, edge], color);
      builder.quad([center, bottom, ridge], [center + .008, bottom, edge], [center + .008, top, edge], [center, top, ridge], color);
    }
    for (const dy of [-.073, .073]) {
      builder.box('container frame edge', [x, y + dy, z + side * .09], [width + .006, .012, .014], frame);
    }
  }
}

function makeGantry(builder) {
  const c = colors;
  for (const x of [.30, .79]) {
    builder.box('parallel rail foundations', [x, .206, -.495], [.078, .062, .71], c.stone);
    for (const z of [-.74, -.25]) {
      builder.box('covered crane bogie', [x, .25, z], [.145, .092, .17], c.dark);
      builder.box('bogie casing trim', [x, .297, z], [.159, .025, .18], c.brass);
      builder.beam('splayed crane portal legs', [x, .296, z], [x + (x < .5 ? .055 : -.055), 1.64, z], .065, c.brass);
    }
    builder.beam('portal side lower ties', [x, .66, -.73], [x, .66, -.25], .031, c.ochre);
    builder.beam('portal side suspension braces', [x, .69, -.73], [x, 1.52, -.25], .026, c.ochre);
  }
  for (const z of [-.74, -.25]) {
    builder.beam('portal cross beam', [.335, 1.61, z], [.756, 1.61, z], .065, c.brass);
    builder.beam('portal front corner reinforcement', [.31, 1.35, z], [.51, 1.61, z], .029, c.ochre);
    builder.beam('portal right corner reinforcement', [.78, 1.35, z], [.60, 1.61, z], .029, c.ochre);
  }
  const chords = [-.84, -.62, -.40, -.18, .04, .26, .48, .70, .92];
  for (const x of [.477, .616]) {
    for (const y of [1.66, 1.85]) {
      builder.beam('continuous box-truss crane chords', [x, y, chords[0]], [x, y, chords.at(-1)], .035, c.brass);
    }
    chords.forEach((z, i) => {
      builder.beam('crane truss verticals', [x, 1.66, z], [x, 1.85, z], .020, c.ochre);
      if (i < chords.length - 1) {
        builder.beam('alternating crane truss diagonals', [x, i % 2 ? 1.85 : 1.66, z], [x, i % 2 ? 1.66 : 1.85, chords[i + 1]], .023, c.brass);
      }
      if (!(i % 2)) builder.beam('crane truss cross-members', [.477, 1.85, z], [.616, 1.85, z], .022, c.ochre);
    });
  }
  builder.box('operator cabin metal body', [.754, 1.50, -.236], [.19, .238, .25], c.ivory);
  builder.box('operator cabin forward glazing', [.754, 1.52, -.106], [.145, .123, .026], c.glass);
  builder.box('operator cabin outer glazing', [.859, 1.52, -.241], [.024, .123, .169], c.glass);
  builder.box('counterweight stack', [.546, 1.56, -.78], [.247, .20, .22], c.dark);
  builder.box('overhead trolley', [.546, 1.628, .55], [.207, .121, .18], c.dark);
  for (const side of [-1, 1]) {
    const x = .546 + side * .048;
    builder.beam('paired lifting lines', [x, 1.573, .55], [x, .96, .55], .009, c.dark);
  }
  builder.box('container handling spreader', [.546, .948, .55], [.262, .041, .151], c.ochre);
  container(builder, .546, .849, .55, c.rust, .274);
}

function hullEdge(form, y, lower) {
  const radial = lower ? .85 : 1;
  return form.map(([x, z], i) => [x * radial, y + (i === 3 ? .065 : 0), .61 + z * radial]);
}

function makeVessel(builder) {
  const c = colors;
  const outline = [[-.88, -.11], [-.71, -.205], [.40, -.203], [.89, 0], [.40, .203], [-.71, .205], [-.88, .11]];
  const lower = hullEdge(outline, .13, true);
  const waterline = hullEdge(outline, .194, false);
  const top = hullEdge(outline, .34, false);
  for (let i = 0; i < top.length; i++) {
    const j = (i + 1) % top.length;
    builder.quad(lower[i], lower[j], waterline[j], waterline[i], c.rust);
    builder.quad(waterline[i], waterline[j], top[j], top[i], c.dark);
    builder.tri([0, .342, .61], top[i], top[j], c.timber);
    builder.beam('ferry gunwale', top[i], top[j], .022, c.ivory);
  }
  builder.box('wheelhouse pedestal', [-.63, .425, .609], [.285, .151, .294], c.stone);
  builder.box('wheelhouse body', [-.63, .565, .61], [.265, .174, .273], c.ivory);
  builder.box('bridge forward windshield', [-.492, .587, .61], [.022, .087, .237], c.dark);
  builder.box('bridge forward central mullion', [-.477, .584, .61], [.022, .093, .018], c.ivory);
  for (const side of [-1, 1]) {
    builder.box('wheelhouse side glazing strip', [-.634, .588, .61 + side * .141], [.21, .085, .018], c.glass);
    builder.box('side window frame', [-.63, .586, .61 + side * .155], [.019, .086, .014], c.ivory);
  }
  builder.frustum('wheelhouse rolled roof edge', -.63, .67, .61, .31, .275, .039, .33, .29, c.metal);
  builder.cylinder('small vessel aerial', -.63, .73, .60, .012, .12, c.dark, .009, 8);
  builder.beam('bridge antenna crossbar', [-.63, .782, .55], [-.63, .782, .67], .009, c.dark);
  for (const [x, color] of [[-.27, c.brass], [.078, c.leaf], [.432, c.rust]]) container(builder, x, .415, .61, color);
  builder.box('gangway gridded walkway', [-.70, .365, .205], [.16, .024, .408], c.timber);
  for (const hand of [-1, 1]) {
    const x = -.70 + hand * .076;
    builder.beam('boarding gangway guardrail', [x, .445, .015], [x, .445, .401], .012, c.metal);
    for (const z of [.02, .2, .395]) builder.beam('gangway rail stanchions', [x, .362, z], [x, .445, z], .010, c.metal);
  }
}

export function buildWorkingHarbor(builder) {
  const c = colors;
  builder.box('calm harbor basin', [0, .114, .17], [1.98, .051, 1.69], c.sea);
  builder.box('quayside stone seawall', [0, .175, -.484], [1.96, .15, .91], c.stone);
  builder.box('continuous waterfront promenade', [0, .259, -.063], [1.96, .055, .157], c.sand);
  for (let i = 0; i < 13; i++) {
    const x = -.92 + i * .15;
    builder.box('spaced seawall facing blocks', [x, .183, -.015], [.137, .099, .042], i % 3 === 0 ? c.sand : c.stone);
  }
  for (const x of [-.91, -.43, .28, .90]) {
    builder.cylinder('promenade mooring bollard', x, .300, .002, .027, .066, c.dark, .020, 10);
    builder.cylinder('bollard cap', x, .337, .002, .030, .015, c.metal, .026, 10);
  }
  makeTerminal(builder);
  makeGantry(builder);
  makeVessel(builder);
  for (const [x, y, z, color] of [[.10, .34, -.41, c.rust], [.10, .50, -.41, c.leaf], [.10, .34, -.74, c.brass]]) container(builder, x, y, z, color, .25);
  for (const [x, z, length] of [[-.94, .33, .08], [-.90, .86, .12], [-.70, .91, .24], [-.20, .94, .18], [.09, .91, .14], [.41, .879, .35], [.82, .90, .15], [.92, .37, .11], [.78, .27, .23], [.10, .22, .20], [-.34, .28, .15]]) {
    builder.box('separate calm water reflections', [x, .142, z], [length, .005, .010], z > .87 ? c.waterLight : c.shallow);
  }
  for (const [x, z, dx] of [[-.87, .513, -.91], [.74, .49, .90]]) {
    builder.beam('mooring line anchored to bollard', [x, .277, z], [dx, .317, .002], .010, c.dark);
  }
}
