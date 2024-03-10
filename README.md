# kobo-moedict（Kobo 萌典）


### 來源：
* 唐鳳的 [萌典](https://github.com/g0v/moedict-webkit)
* 教育部重編國語辭典 [資料檔](https://github.com/g0v/moedict-data)

> 上述兩本字典皆含詞語，最後取用的方式皆以先將兩本字典都篩選出只有“單”字的部分。

* csv 轉成 kobo dict [penelope](https://github.com/pettarin/penelope)  
（這個專案已被封存，但我會持續使用它來轉檔，哪天用不了，再想辦法）

### 資料夾結構
```
├── onlyTradition // 教育部重編國語辭典
│   ├── @all.csv // 用來轉成 kobo dict 的 csv
│   ├── dicthtml-TW.zip // kobo 專用字典檔
│  
├── onlyTradition // 繁+簡字典
│   ├── @all.csv // 用來轉成 kobo dict 的 csv
│   ├── dicthtml-TW.zip // kobo 專用字典檔
│  
├── README.md
```


### 繁體字典：
> 由 **教育部重編國語辭典** 轉成。

直接拿國語辭典的 json 轉成 csv，唯一變動的只有“無讀音”的異體字。

變動的方式是去提取「」裡的字（`「幾」的異體字。` ），再將此字與剩餘的字匹配，以括號裡為例，拿出 `幾`，找出所有**幾**的讀音，以斜線分格，組成注音 `ㄐㄧ/ㄐㄧˇ`。

此字典檔因為沒有做過多餘比對，基本上不會有錯誤。

<br>

### 繁體+簡體字典：
> 由 **教育部重編國語辭典** 和 **萌典簡體字典** 組成。

將教育部重編國語辭典，先拆出“無讀音”的異體字的部分（代號 s，因為發現裡面有很多簡體字），和剩餘部分（代號 A）和萌典裡的簡體字典（代號 c，c.txt）。

拿 s 與 c 比對，取出只有在 s 裡的字成 B，然後以 c 為基底組成簡體字典 C 。

拿 C 與 A 比對， C 去除與 A 相同的字得到 C' 。 

最後將 A + B + C' 合起來為字典。

因為比對較為複製，除了由程式篩選外，還加了少許人工步驟，需要的就小心服用。

<br>

### Kobo 專用字典檔：

* 教育部重編國語辭典 [*here*](https://github.com/hsuan9522/kobo-moedict/blob/master/onlyTradition/dicthtml-TW.zip)

* 繁簡體字典 [*here*](https://github.com/hsuan9522/kobo-moedict/blob/master/tranditionNsimple/dicthtml-TW.zip)

<br>

### 如何放進 Kobo

> 載完後，直接丟入 .kobo/dict 或 .kobo/custom-dict 即可。

* `.kobo/dict` 預設字典檔的位置，放這裡會覆蓋掉預設的字典。
* `.kobo/custom-dict` 客製化的字典檔，到時候看到的字典名字後面會有**客製化**的字樣。

檔名需改成正確的格式，例如 dicthtml-xx-xx 或 dicthtml-xx 。  
**xx** 使用 [ISO 639-1 碼](https://zh.wikipedia.org/zh-tw/ISO_639-1) （繁中為 zh-TW or TW，簡中為 zh-CN or CN），亂打的話，會直接出現原始檔名，例如： dicthtml-kk.zip 。  
※ 如果連沒有按照上面的規則，則是會讀取不到 。

<br>

### 補充說明
沒有經過特殊設置的 kobo 裝置，是無法看到**注音符號**的，有需求的話，請移駕到另一篇[文章](https://medium.com/@hsuan9522/kobo-reader-plugin-300eda218441)，找到第三點的 **Kobopatch** 把對應 `改字典字體功能`（Dictionary text font-family/font-size/line-height）打開且選擇 `AR UDJingxihei` 這個字體，最後安裝即可。

<br>

---

字典如果有發現錯誤，歡迎回報。

<a href="https://www.buymeacoffee.com/hsuan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 165px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

