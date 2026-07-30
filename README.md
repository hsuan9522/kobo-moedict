# kobo-moedict（Kobo 萌典）

專為 Kobo 閱讀器製作的中文單字字典，內容取自教育部《重編國語辭典修訂本》與萌典資料，並轉換成 Kobo 可讀取的字典格式。

## 下載字典

### 教育部重編國語辭典

- [繁體注音版](https://github.com/hsuan9522/kobo-moedict/blob/master/dictionary/tranditional/dicthtml-TW.zip)

### 繁體＋簡體字典

- [注音版](https://raw.githubusercontent.com/hsuan9522/kobo-moedict/master/dictionary/dicthtml-TW.zip)
- [拼音版](https://raw.githubusercontent.com/hsuan9522/kobo-moedict/master/dictionary/dicthtml-CN.zip)

## 安裝方式

下載字典檔後，將 ZIP 檔放入 Kobo 的下列其中一個目錄：

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

字典檔名必須符合 Kobo 的命名規則，例如：

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

請參考[這篇文章](https://medium.com/@hsuan9522/kobo-reader-plugin-300eda218441)的第三部分，透過 Kobopatch 啟用：

```text
Dictionary text font-family/font-size/line-height
```

並將字型設定為：

```text
AR UDJingxihei
```

## 資料來源

本專案使用以下資料與工具：

- 唐鳳的[萌典](https://github.com/g0v/moedict-webkit)
- 教育部《重編國語辭典修訂本》[資料檔](https://github.com/g0v/moedict-data)
- 字典格式轉換工具 [PyGlossary](https://github.com/ilius/pyglossary)

原始字典包含單字與詞語；本專案會先篩選出單字資料，再轉換為 Kobo 字典格式。

## 字典整理方式

### 繁體字典

繁體字典由教育部《重編國語辭典修訂本》轉換而成。

處理時會將原始 JSON 轉為 CSV。對於沒有獨立讀音的異體字，程式會從解釋中的「某字的異體字」資訊找出對應正字，再取得該字的讀音。

例如：

```text
「幾」的異體字。
```

程式會找出「幾」的所有讀音，並以斜線分隔：

```text
ㄐㄧ/ㄐㄧˇ
```

### 繁體＋簡體字典

繁體＋簡體字典由下列資料組成：

- 教育部《重編國語辭典修訂本》
- 萌典簡體字典

處理流程如下：

1. 將教育部字典分為一般繁體資料與無獨立讀音的異體字資料。
2. 將異體字資料與萌典簡體資料比對。
3. 保留只出現在異體字資料中的字。
4. 以簡體字對應的繁體字和教育部字典比對。
5. 將缺少的簡體字與對應解釋合併。
6. 產生注音版與拼音版 Kobo 字典。

查詢「卜」字時，輸出格式大致如下：

```html
卜,﹝蔔﹞﹝卜﹞
<font color="#f00">ㄅㄨˇ</font><br>
[名]<br>
1. 古人灼燒龜甲或牛骨，辨視其裂紋以推斷事情吉凶的行為。<br>
2. 泛指一般預測吉凶的方法。<br>
```

其中 `﹝﹞` 內會顯示對應的繁體字。

## 專案結構

```text
kobo-moedict/
├── dictionary/
│   ├── tranditional/
│   │   └── dicthtml-TW.zip    # 教育部字典，繁體注音版
│   ├── dicthtml-TW.zip        # 繁體＋簡體，注音版
│   └── dicthtml-CN.zip        # 繁體＋簡體，拼音版
├── format/                    # 字典資料處理與轉換程式
├── DATA_LICENSE.md            # 字典資料授權
├── THIRD_PARTY_NOTICES.md     # 第三方來源與授權
├── LICENSE                    # 原創程式碼的 MIT License
└── README.md
```


## 授權

本專案採分離授權：

- `format/` 內的原創轉換程式使用 [MIT License](LICENSE)。
- `dictionary/` 內的字典內容及產出的字典檔不適用 MIT，仍依原始資料來源的授權條款提供。
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
