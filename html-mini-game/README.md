# 太空閃躲者（HTML Canvas 小遊戲）

## 玩法
- 方向鍵 / WASD：移動
- Space：暫停 / 繼續
- 手機：用手指在畫面拖曳飛船

## 資料夾結構
- index.html
- css/style.css
- js/main.js
- assets/（目前保留給你放圖片/音效）

## 如何在 Windows 開啟
1. 解壓縮後，直接用 Chrome / Edge 連點打開 `index.html`。
2. 如果你想用「本機伺服器」跑（比較像正式網站），可用下面方式：

[程式框]
# 進到專案資料夾
cd html-mini-game

# 用 Python 開一個本機伺服器（Windows CMD / PowerShell 都可）
python -m http.server 8000
[/程式框]

接著在瀏覽器開：
- http://localhost:8000

## 你可以怎麼改成課堂作業
- 把「能量球」改成「加分題」
- 把「隕石」改成「病毒/駭客封包」
- 增加排行榜：把最高分存到 Firebase / Google Sheet

祝你玩得開心！
