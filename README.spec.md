# Kobo 萌典建置規格

本文件描述目前正式建置流程。三版本均由 `scripts/build.py`、`format/export.js`、
`format/render.js` 產生，不再維護獨立 sample 規則。

## 版本與字頭

| ID               | 內容                     | 讀音 | 成品                                    |
| ---------------- | ------------------------ | ---- | --------------------------------------- |
| traditional-bpmf | 僅教育部                 | 注音 | dictionary/tranditional/dicthtml-TW.zip |
| combined-bpmf    | 教育部優先、兩岸詞典補缺 | 注音 | dictionary/dicthtml-TW.zip              |
| combined-pinyin  | 與繁簡注音相同內容與順序 | 拼音 | dictionary/dicthtml-CN.zip              |

只建立 Unicode 單字字頭。多字詞保留在來源索引，僅供引用，不建立獨立字頭。
各讀音的完全空白釋義（沒有 def、link、example、quote）略過；整個字無內容時不輸出。
`c.json` 與 `dict-revised_old.json` 為保留的歷史資料，不參與任何建置。

## 繁簡合併

- 所有讀音項的 `alt` 都參與對應；只有單字 alt 建立查詢字頭。組字描述略過並列入 summary。
- 查詢字頭本身有教育部內容時先列自身，其餘對應依來源順序去重。
- 每個對應繁體字獨立採教育部優先，沒有才採輔助來源；不補主來源已有字的其他讀音或義項。
- 純異體字說明也視為主來源已有該字。
- 一簡對多繁保留各字全部讀音與釋義，不依 alt 所在讀音縮限。
- `﹝字﹞` 總覽只列對應字，不提早顯示讀音；多字分組用 `【字】` 與文字 `-----` 區分。
- 不顯示箭頭對應句或「解釋見本頁對應分組」提示。

## 讀音及排版

- 全部釋義使用 `·` 加一個不換行空格，不使用數字釋義序號。
- 讀音非粗體，緊接標題時不加空行，接在上一組內容後才加 `<br>`。
- 正式讀音編號 `㈠㈡…` 取自原始 Excel 的 H 欄（多音排序），按字頭、注音與拼音匹配。
  H=0 的單音來源可顯示 ㈠；教育部無可靠對照時不猜編號；輔助來源依先實義、後異體的最終顯示順序給編號。借音沿用正字編號，多正字借音加上各字頭以免混淆。
- 原始 `(一)之又音。`、`(一)5.之又音。` 等文字完整保留，不改寫。
- 輔助來源臺陸標示保留；讀音斜線兩側使用 `&nbsp;`。
- 有 type 才顯示 `[名]`、`[動]` 等詞性，不新增 `[其他]`。
- 詞性字級 0.85em。example 0.9em；quote、link 0.85em，顏色 #555555。
- example、quote、link 左側縮排 2em，上下 margin 各 0.3em。
- 展開內容外層 0.85em、#555555，內層補充字級繼續相乘（已確認保留）。
- 不用 table、CSS Grid 或邊框線排字典正文；只用簡單區塊與行內樣式。

## 異體字

- 只有完整「某字的異體字」釋義視為純異體字說明，不把含實義的整句當成純轉介。
- 一般解釋先顯示，純異體字說明移至各字分組末尾；仍保留它的原讀音。
- 有音讀音組本身混有一般釋義時，末尾異體說明標示 `[異體]`；該讀音組只有異體說明則省略此標題。
- 混合條目中，無讀音的異體說明放在所有有音組之後，以文字 `---` 及獨立 `[異體]` 標題分隔，避免歸入上一組讀音。整字無音借音與有音異體組不加此分隔。
- 整個字分組原本無注音及拼音、且只有異體字說明：借用正字全部讀音，連同正字編號去重並以斜線分隔，省略 `[異體]`。
- 不覆寫原始讀音；只為無音純異體組借音。借音查找可沿鏈，遇循環停止。
- 異體字說明下附正字解釋，本身有讀音時只取正字匹配的讀音組；完全無匹配時不展開，即使正字只有單音也必須匹配。本身無音時仍保留正字全部讀音。省略重複的 `﹝字﹞`。
- 展開內容的讀音與上方原讀音相同時省略重複讀音及編號；讀音不同、或原字無音借用正字讀音時仍保留。
- 實際解釋只展開一層；正字再轉介時保留原文，不繼續展開。
- 若正字已是本字頭的獨立繁簡分組，不再複製其解釋。

## 參見與同字轉介

以原始 def、link 欄位決定展開，之後才把空 def 的 link 提升為主要釋義。

| 條件                                                 | 行為                              |
| ---------------------------------------------------- | --------------------------------- |
| def 以參見「詞」或參見【詞】開頭                     | 展開參見目標                      |
| def 有實義、之後才出現參見                           | 保留原文，不展開                  |
| def 出現同「字」                                     | 保留原文，不展開                  |
| link 出現同「字」，原始 def、example、quote 都無內容 | 展開；link 提升為正文、不重複列出 |
| link 出現同「字」，原始 def 有描述                   | 保留 link，不展開                 |
| 同一 link 同時有同及參見                             | 只展開參見，保留整段原文          |
| 也作                                                 | 不展開                            |

- link 的同字轉介僅在原始 def、example、quote 全部無內容時展開；只有空白視為無內容。例句或引文有內容時保留原文、不展開；參見不受此限制。
- 多個 link 各自判斷；同筆釋義相同目標去重，保留順序。
- 同字轉介只有單一且相同的單字目標時省略重複標題；多目標保留各自標題。
- 一般參見保留 `﹝詞﹞`，展開內容的讀音不顯示國字編號；主字、異體字借音及同字展開的編號保留；選取後只有一組讀音時與標題同行，多組讀音則於下方分組，標題只列一次。
- 目標只有一組讀音直接採用；多組時按查詢字在詞中的位置比讀音，有匹配只採匹配組。
- 多組但完全匹配不到，採目標全部組別；不因輕聲、兒化等格式差異而整段隱藏。
- 不把原文 `(一)`、`(二)` 當成 JSON 陣列索引。
- 找不到目標只保留原文，不留空區塊。展開只到一層，內文轉介不繼續展開。

## 特殊字形

來源 JSON 不改寫。只有已可靠確認的代碼對照才可還原。
未還原代碼字頭略過，內文未知代碼顯示 ☒；完整位置列入 glyphs-review.json。
不因 Kobo 字型缺字而刪除已有效編碼的漢字。

## 重建與驗證

- 讀音編號：data/reading-orders.json；原始檔網址及 SHA-256：data/reading-orders-source.json。
- 原始 Excel 可重新取得，scripts/extract-reading-orders.py 只用 Python 標準函式庫讀取。
- requirements.txt 固定 PyGlossary 與 marisa-trie 版本。
- 每版獨立工作目錄，記錄兩份採用來源與編號對照雜湊、數量、忽略的 alt 及未知字形。
- 打包至新暫存目錄，失敗保留供檢查；所有指定版本驗證通過才更新正式下載檔。
- 驗證 ZIP CRC、MARISA words 索引、所有字頭唯一性與 Unicode 單字限制，並逐筆比對完整 HTML 與 CSV。
- dictionary/build-manifest.json 記錄此次產物與雜湊；output 下皆可刪除重建。
- scripts/preview.js 使用相同正式渲染器重建 33 個代表字例的三版本預覽，輸出至 demo/index.html；demo 納入 Git。

## 程式組織與格式

- `format/config.js`：三版本與路徑設定。
- `format/data.js`：來源讀取、缺字代碼、資料正規化、字頭篩選、繁簡分組與引用查找索引。
- `format/readings.js`：來源編號、顯示編號、異體字排序與借音。
- `format/references.js`：引用辨識、def/link 展開政策、目標讀音選取與引用報告。
- `format/render.js`：內容組織與 Kobo 行內樣式渲染，不再分為 sample 與正式流程。
- `format/export.js`：CSV 與來源／字形／忽略項目報告。
- `format/verify_kobo.py`：ZIP、MARISA 與完整 HTML 驗證。

每個主要 JavaScript 職責有對應測試檔；合併前的測試案例完整保留。
程式碼使用 VS Code 已設定的 Prettier，專案 `.prettierrc.json` 固定 4 格縮排。
`/output/` 整個忽略，`demo/` 以可追蹤的展示檔案保留。


## 建置

需要 Node.js（支援 `node --test`）及 Python 3.10 以上。

```sh
python -m pip install -r requirements.txt
node --test --test-concurrency=2 format/*.test.js
python scripts/build.py
```

也可只建一版：

```sh
python scripts/build.py traditional-bpmf
python scripts/build.py combined-bpmf
python scripts/build.py combined-pinyin
```

`bash run.sh` 是相同流程的相容入口，`tw`、`cn` 別名仍可使用。
每版先產生 `output/<版本>/dictionary.csv` 與檢查報告，再打包並核對 ZIP CRC、
MARISA 索引及**每一字頭的完整 HTML**。所有指定版本通過後，才替換 `dictionary/`
內的下載檔。`dictionary/build-manifest.json` 記錄該次建置的數量、來源雜湊、工具版本
及成品 SHA-256；`output/` 全部是可重建產物，可刪除。

讀音編號對照已保存在 `data/reading-orders.json`，一般建置不需連網或原始 Excel。
要更新對照，先從 `data/reading-orders-source.json` 的網址取得原始檔，再執行：

```sh
python scripts/extract-reading-orders.py /path/to/dict_revised_1.xlsx
```

重新產生 33 個代表字例的三版本 HTML 預覽：

```sh
node scripts/preview.js
```

檔案為 [`demo/index.html`](demo/index.html)，使用正式建置的同一渲染器，
並納入 Git；每個字的檢查用途列於 [`demo/cases.json`](demo/cases.json)。
