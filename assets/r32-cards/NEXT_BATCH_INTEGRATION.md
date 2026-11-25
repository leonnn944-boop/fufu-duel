# 九組事件語意圖（14來源ID）

本批只新增九張原生程序渲染圖，原36張 PNG 雜湊不變。沒有改 UI、規則或角色模型。manifest 現共45張，這不等於全牌庫換圖或全套驗收。

| 精確ID | 圖檔（省略.png） | 圖意 |
|---|---|---|
| DA018、DB014 | event-move-to-suburbs | 搬家車、郊區低樓住宅與綠地 |
| DA019 | event-secondhand-sale | 二手書本、家用品、轉售包裹 |
| DA028 | event-supermarket-anniversary-sale | 超市周年慶、購物籃及有效折扣 |
| DA035、DB026 | event-cashback-cancelled | 回饋返回箭頭被取消叉號中斷 |
| DA041、DB032 | event-building-management-fee-increase | 社區住宅與管理費調高公告 |
| DA044、DB035 | event-fuel-price-increase | 加油機、油槍與油價上升 |
| DA060、DB051 | event-family-emergency-support | 玩家向家人交付急用援助信封 |
| DB009 | event-mentor-opportunity | 導師指引、討論及引薦文件 |
| L013 | event-member-cash-voucher | 會員識別卡與贈送的抵用券 |

使用 exact-ID 字典，不能用 DA／DB 或 cash 類別全域替換。可直接參考 `next-batch-mapping.json`。每列原文、數值欄、效果及不適用條件保存在 manifest 的 source；圖片不含固定金額。

DA018 原文含「自營商不適用」，DB014 沒有此句；共圖不合併適用規則。管理費、油價與取消回饋的向上／取消標記表示費用變動，不是獲利。家人金援的箭頭朝收援家人，表示向外支出。L013 原文是抵用券，來源仍按既有 currentIncome 處理，不新增券資產。

人物沿用現有原生角色僅為情境示意，不限定該職業才適用。九圖以1024×768輸出，使用 `object-fit:contain`；已檢查112／140／164px圖框高度，但未在本素材工作中重跑正式遊戲布局。

生成腳本 `qa-r32-next-card-assets.mjs` 預設只列計畫；取得GPU交接後以 `--render` 執行。驗證腳本 `qa-r32-next-card-assets-verify.mjs` 檢查九圖尺寸、非空、留白、全45圖manifest雜湊並產生三張縮圖檢視表。此次證據：`evidence/r32-next-card-verify-1792984599432/`。
