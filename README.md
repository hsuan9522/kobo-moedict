# kobo-moedict（Kobo 萌典）

專為 Kobo 閱讀器製作的中文單字字典，內容取自教育部《重編國語辭典修訂本》與萌典資料，並轉換成 Kobo 可讀取的字典格式。

## 下載字典

請前往 [GitHub Releases](https://github.com/hsuan9522/kobo-moedict/releases)，在發布版本的 **Assets（附件）** 中下載需要的字典 ZIP：

| 版本             | 收錄內容                     | 讀音顯示 |
| ---------------- | ---------------------------- | -------- |
| 純繁體－注音     | 教育部《重編國語辭典修訂本》 | 注音     |
| 繁體＋簡體－注音 | 教育部為主，兩岸詞典補充     | 注音     |
| 繁體＋簡體－拼音 | 教育部為主，兩岸詞典補充     | 拼音     |

請下載字典 ZIP，無須下載 **Source code**。

## 安裝方式

下載解壓縮後，將 ZIP 檔放入 Kobo 的下列其中一個目錄：

```text
.kobo/dict
```

或：

```text
.kobo/custom-dict
```

兩個目錄的差異：

- `.kobo/dict`：Kobo 預設字典位置，放入同名字典可能會覆蓋原有字典。
- `.kobo/custom-dict`：自訂字典位置，字典名稱後方會顯示「客製化」。

字典檔名若想修改，必須符合 Kobo 的命名規則，例如：

```text
dicthtml-xx.zip
dicthtml-xx-xx.zip
```

其中 `xx` 為 [ISO 639-1 語言代碼](https://zh.wikipedia.org/zh-tw/ISO_639-1)，例如：

- 繁體中文：`TW` 或 `zh-TW`
- 簡體中文：`CN` 或 `zh-CN`

若使用其他代碼，Kobo 會直接顯示原始檔名，例如 `dicthtml-kk.zip`。檔名格式不正確時，Kobo 也可能無法讀取字典。

## 注音顯示

未經設定的 Kobo 無法正常顯示注音符號。

請參考[這篇文章](https://kobo.cjhsuan.com/tools/dictionary)的第四步驟，透過 Kobopatch 啟用：

```text
Dictionary text font-family/font-size/line-height
```

並將字型設定為：

```text
AR UDJingxihei
```


## 字典顯示範例

[字典格式預覽](https://hsuan9522.github.io/kobo-moedict/)，可切換純繁體注音、繁簡注音及繁簡拼音三種版本。

範例涵蓋基本排版、繁簡對應、異體字與借音、引用規則及讀音編號；各字上方列有檢查用途。預覽與 Kobo 字典共用同樣的渲染樣式，但瀏覽器的換行、字型與間距可能與 Kobo 實機不同。

## 資料來源與收錄規則

- 主來源：教育部《重編國語辭典修訂本》，`data/dict-revised.json`。
- 輔助來源：兩岸詞典資料，`data/dict-csld.json`；提供繁簡對應與主來源缺少的字。
- 資料整理專案：[moedict-data](https://github.com/g0v/moedict-data)、[moedict-process](https://github.com/g0v/moedict-process)。
- 字典打包：[PyGlossary](https://github.com/ilius/pyglossary)。

只收錄一個 Unicode 字元的獨立字頭，包含擴充漢字。多字詞可出現在參見的展開內容，
但不新增為查詢字頭。

1. 純繁體版的所有內容只使用教育部資料。
2. 繁簡版以教育部內容優先。主字頭下方的 `﹝字﹞` 顯示一簡對多繁的字，
   且保留各繁體字的完整讀音與釋義。

讀音的 `㈠`、`㈡` 依教育部資料「多音排序」顯示，保留 `(一)之又音。`
等原始說明。
輔助來源其讀音編號則比照處理。釋義使用點號排序，例句、引文與 link 縮排，其餘異體字說明放在末尾的 `[異體]`。
完整顯示與引用規則見 [README.spec.md](README.spec.md)。

## 專案結構

```text
kobo-moedict/
├── data/             # 兩份辭典、讀音編號對照及其來源紀錄
├── format/           # 處理邏輯及測試
├── demo/             # 預覽 Html
├── scripts/          # 建置、預覽及來源編號提取
├── output/           # 可重建之資料
├── requirements.txt
├── run.sh
├── README.spec.md
├── DATA_LICENSE.md
├── THIRD_PARTY_NOTICES.md
└── LICENSE
```

## 授權

本專案採分離授權：

- `format/` 內的原創轉換程式使用 [MIT License](LICENSE)。
- Releases 提供的字典檔不適用 MIT，仍依原始資料來源的授權條款提供。
- 教育部《重編國語辭典修訂本》文字資料的著作權仍屬教育部，依 CC BY-ND 3.0 Taiwan 提供。
- 教育部的授權說明允許格式轉換及後續應用，但不因此將原始文字內容改授權為 MIT。
- 完整授權範圍、姓名標示與第三方來源請參閱 [DATA_LICENSE.md](DATA_LICENSE.md) 與 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 問題回報

如果發現字典內容、讀音或轉換結果有誤，歡迎透過 GitHub Issues 回報。

<a href="https://www.buymeacoffee.com/hsuan">
  <img
    src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
    alt="Buy Me A Coffee"
    height="41"
    width="165"
  >
</a>
