import * as pc from '../vendor/playcanvas.min.mjs';

// Two meshes cover the whole route: a contrasting outline and the painted inset.
const paintLayers = [
  { color: '#173846', width: .39, height: .358 },
  { color: '#ffe8b2', width: .205, height: .365 },
];

function addWing(positions, triangles, tail, tip, width, height) {
  const dx = tip.x - tail.x;
  const dz = tip.z - tail.z;
  const length = Math.hypot(dx, dz);
  const alongX = dx / length;
  const alongZ = dz / length;
  const halfWidth = width / 2;
  const bevel = width * .24;
  const corners = [
    [bevel, -halfWidth],
    [length - bevel, -halfWidth],
    [length, -halfWidth + bevel],
    [length, halfWidth - bevel],
    [length - bevel, halfWidth],
    [bevel, halfWidth],
    [0, halfWidth - bevel],
    [0, -halfWidth + bevel],
  ];
  const first = positions.length / 3;
  for (const [forward, side] of corners) {
    positions.push(tail.x + alongX * forward - alongZ * side, height,
      tail.z + alongZ * forward + alongX * side);
  }
  for (let corner = 1; corner < corners.length - 1; corner++) {
    triangles.push(first, first + corner + 1, first + corner);
  }
}

export function buildBoardRouteMarkings(scene, tileAt, tileCount) {
  const mark = new pc.Entity('board route chevrons');
  const meshInstances = paintLayers.map(layer => {
    const positions = [];
    const triangles = [];
    for (let index = 0; index < tileCount; index++) {
      const start = tileAt(index);
      const end = tileAt((index + 1) % tileCount);
      const length = Math.hypot(end.x - start.x, end.z - start.z);
      const x = (end.x - start.x) / length;
      const z = (end.z - start.z) / length;
      const centerX = (start.x + end.x) / 2;
      const centerZ = (start.z + end.z) / 2;
      const tip = { x: centerX + x * .5, z: centerZ + z * .5 };
      for (const side of [-1, 1]) {
        const tail = { x: centerX - x * .64 - z * side * .72, z: centerZ - z * .64 + x * side * .72 };
        addWing(positions, triangles, tail, tip, layer.width, layer.height);
      }
    }
    const mesh = new pc.Mesh(scene.app.graphicsDevice);
    mesh.setPositions(positions);
    mesh.setNormals(pc.calculateNormals(positions, triangles));
    mesh.setIndices(triangles);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    return new pc.MeshInstance(mesh, scene.material(layer.color));
  });
  mark.addComponent('render', { meshInstances });
  scene.mapRoot.addChild(mark);
}
