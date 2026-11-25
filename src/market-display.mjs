// Display labels only. Original titles and source percentages remain available in card details.
const titles={
  "M101": "1990 日本泡沫破裂",
  "M102": "1993 歐盟成立",
  "M104": "1994 北美自由貿易協定",
  "M106": "1995–1996 台海危機",
  "M201": "1997 亞洲金融風暴",
  "M202": "1999 歐元電子交易",
  "M306": "2001 中國加入 WTO",
  "M402": "2010 歐債危機",
  "M404": "2007 初代 iPhone 發表",
  "M406": "2008 雷曼倒閉",
  "M501": "2011 日本地震與核災",
  "M502": "2012 歐洲央行捍衛歐元",
  "M503": "2013 非洲行動支付",
  "M602": "2016 英國脫歐公投",
  "M604": "2017 美國企業稅改",
  "M606": "2018 中美貿易戰",
  "M701": "2020 晶片需求升溫",
  "M702": "2022 俄烏戰爭",
  "M704": "2022 生成式 AI 熱潮",
  "M706": "2020 全球疫情"
};
export const marketTitle=event=>titles[event.id]||event.title;
