// Tile order and contents follow user-selected 桌遊地圖_5.jpg, Drive file 1YD5SYEQoUKQtmE_1hPs0lK5xfYGW3kAi.
// The artwork numbers 1–9 and 11–19. The two logo corners are unnumbered here as 0 and 10.
// Players are randomly divided between these opposite logo corners at game start.
// Display coordinates make a regular seven-column, five-row perimeter.
export const BOARD_SOURCE = Object.freeze({
  fileId: '1YD5SYEQoUKQtmE_1hPs0lK5xfYGW3kAi',
  title: '桌遊地圖_5.jpg',
  sha256: '021738FF9A5BECD0AC84458B695662BEFAA568D360192C33AB30DB7964F3B6E7',
  selectedByUser: '2026-10-23',
});

// Names used by the physical tiles, miniatures, route index and both game clients.
// Compact labels are individually set so the overview shows the attraction at a glance.
function stop(name, shortName, location, model = null) {
  return Object.freeze({name, shortName, location, model});
}
export const WORLD_STOPS = Object.freeze([
  stop('國際機場', '機場', '起點角', 'airportStart'),
  stop('臺北 101', '101', '臺灣・臺北', 'tower'),
  stop('吉薩金字塔群', '金字塔', '埃及・吉薩', 'giza'),
  stop('羅馬競技場', '競技場', '義大利・羅馬', 'colosseum'),
  stop('巴比倫空中花園', '空中花園', '古巴比倫', 'hangingGardens'),
  stop('泰姬瑪哈陵', '泰姬陵', '印度・阿格拉', 'tajMahal'),
  stop('雪梨歌劇院', '歌劇院', '澳洲・雪梨', 'opera'),
  stop('吳哥窟', '吳哥窟', '柬埔寨・暹粒', 'angkorWat'),
  stop('復活節島摩艾石像', '摩艾石像', '智利・復活節島', 'moai'),
  stop('萬里長城', '長城', '中國・北京', 'greatWall'),
  stop('環球郵輪港', '郵輪港', '起點角', 'cruiseStart'),
  stop('富士山與紅鳥居', '富士山', '日本', 'mountFuji'),
  stop('義大利比薩斜塔', '比薩斜塔', '義大利・比薩', 'pisaTower'),
  stop('英國巨石陣', '巨石陣', '英國・威爾特郡', 'stonehenge'),
  stop('杜拜哈里發塔', '哈里發塔', '阿聯酋・杜拜', 'dubai'),
  stop('倫敦大笨鐘', '大笨鐘', '英國・倫敦', 'bigBen'),
  stop('巴黎艾菲爾鐵塔', '艾菲爾', '法國・巴黎', 'easel'),
  stop('馬丘比丘', '馬丘比丘', '秘魯・庫斯科', 'machuPicchu'),
  stop('紐約自由女神像', '自由女神', '美國・紐約', 'liberty'),
  stop('舊金山金門大橋', '金門橋', '美國・舊金山', 'goldenGate'),
]);
export const BOARD_NAMES = Object.freeze(WORLD_STOPS.map(stop => stop.name));

// general = ? icon; career = briefcase icon. A lucky corner also grants the
// small-luck card described in the historical concept document when passed.
export const BOARD = Object.freeze([
  {n:0,type:'logo',label:BOARD_NAMES[0],x:0.894444,y:0.894444},
  {n:1,type:'fate',general:2,career:1,x:0.762963,y:0.894444},
  {n:2,type:'fate',general:1,career:2,x:0.631481,y:0.894444},
  {n:3,type:'fate',general:3,career:3,x:0.5,y:0.894444},
  {n:4,type:'fate',general:2,career:2,x:0.368519,y:0.894444},
  {n:5,type:'fate',general:3,career:1,x:0.237037,y:0.894444},
  {n:6,type:'lucky',general:3,career:2,x:0.105556,y:0.894444},
  {n:7,type:'fate',general:1,career:3,x:0.105556,y:0.697222},
  {n:8,type:'fate',general:2,career:3,x:0.105556,y:0.5},
  {n:9,type:'fate',general:1,career:1,x:0.105556,y:0.302778},
  {n:10,type:'logo',label:BOARD_NAMES[10],x:0.105556,y:0.105556},
  {n:11,type:'fate',general:3,career:3,x:0.237037,y:0.105556},
  {n:12,type:'fate',general:2,career:3,x:0.368519,y:0.105556},
  {n:13,type:'fate',general:1,career:1,x:0.5,y:0.105556},
  {n:14,type:'fate',general:1,career:3,x:0.631481,y:0.105556},
  {n:15,type:'fate',general:2,career:2,x:0.762963,y:0.105556},
  {n:16,type:'lucky',general:3,career:2,x:0.894444,y:0.105556},
  {n:17,type:'fate',general:2,career:1,x:0.894444,y:0.302778},
  {n:18,type:'fate',general:3,career:1,x:0.894444,y:0.5},
  {n:19,type:'fate',general:1,career:2,x:0.894444,y:0.697222},
]);

if (BOARD.length !== 20 || WORLD_STOPS.length !== BOARD.length || BOARD.some((tile, index) => tile.n !== index || !WORLD_STOPS[index].model)) {
  throw new Error('棋盤格位編號不完整');
}
