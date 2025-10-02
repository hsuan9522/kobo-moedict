# kobo-moedict（Kobo 萌典）

### Kobo 專用字典檔：

* 教育部重編國語辭典 [*注音版*](https://github.com/hsuan9522/kobo-moedict/blob/master/dictionary/tranditional/dicthtml-TW.zip)

* 繁+簡體字典 [*注音版*](https://raw.githubusercontent.com/hsuan9522/kobo-moedict/master/dictionary/dicthtml-TW.zip) [*拼音版*](https://raw.githubusercontent.com/hsuan9522/kobo-moedict/master/dictionary/dicthtml-CN.zip)


### 如何放進 Kobo

> 載完後，直接丟入 .kobo/dict 或 .kobo/custom-dict 即可。

* `.kobo/dict` 預設字典檔的位置，放這裡會覆蓋掉預設的字典。
* `.kobo/custom-dict` 客製化的字典檔，看到的字典名字後面會有**客製化**的字樣。

檔名需改成正確的格式，例如 dicthtml-**xx-xx** 或 dicthtml-**xx** 。  
**xx** 使用 [ISO 639-1 碼](https://zh.wikipedia.org/zh-tw/ISO_639-1) （繁中為 zh-TW or TW，簡中為 zh-CN or CN），亂打的話會直接出現原始檔名，例如： dicthtml-kk.zip 。  
※ 如果沒有按照規則，則會讀取不到 。


### 注意事項
沒有經過特殊設置的 kobo 裝置是無法看到**注音符號**，設置方式，請到[文章](https://medium.com/@hsuan9522/kobo-reader-plugin-300eda218441)，找到第三點的 **Kobopatch** 把對應 `改字典字體功能`（Dictionary text font-family/font-size/line-height）打開且選擇 `AR UDJingxihei` 字體，安裝完後即可看到注音。

<br>

## 專案介紹

### 來源：
* 唐鳳的 [萌典](https://github.com/g0v/moedict-webkit)
* 教育部重編國語辭典 [資料檔](https://github.com/g0v/moedict-data)

> 上述兩本字典皆含詞語，最後取用的方式皆以先將兩本字典都篩選出只有「單」字的部分。

* csv 轉成 kobo dict 工具 [pyglossary](https://github.com/ilius/pyglossary)  


### 資料夾結構
```
├── dictionary
│   ├── traditional
│   │   ├── dicthtml-TW.zip  // 繁 - 注音
│   ├── dicthtml-TW.zip      // 繁+簡 - 注音
│   ├── dicthtml-TW.zip      // 繁+簡 - 拼音
│
├── format // 轉換程式
│   ├── ...
│ 
├── README.md
```


### 繁體字典：
> 由 **教育部重編國語辭典** 轉成。

直接拿國語辭典的 json 轉成 csv，唯一變動的只有「無讀音」的異體字。

變動的方式是去提取「」裡的字（`「幾」的異體字。` ），再將此字與剩餘的字匹配，以括號裡為例，拿出 `幾`，找出所有**幾**的讀音，以斜線分格，組成注音 `ㄐㄧ/ㄐㄧˇ`。

此字典檔因為沒有做過多餘比對，基本上不會有錯誤。

<br>

### 繁體+簡體字典：
> 由 **教育部重編國語辭典**（c.txt） 和 **萌典簡體字典**（dict-revised.json）組成。 

將教育部重編國語辭典，先拆出「無讀音」的異體字的部分（代號 s，因為發現裡面有很多簡體字），和剩餘部分（代號 A）和萌典裡的簡體字典（代號 c，c.txt）。

拿 s 與 c 比對，取出只有在 s 裡的字成 B。

拿 c 裡對應的繁體字與 A 比對，不在 A 裡的組成 C1。如果這個字在 A 裡，且簡繁不同，則取第一個匹配到的繁體解釋組成 C2。簡繁如果相同，只會把這個字記錄下來，後續直接顯示在多繁的結果中。

最後將 A + B + C1 + C2 合起來為字典。

查找輸出如下：找「卜」字，﹝﹞內會為多繁的結果。
```html
卜,﹝蔔﹞﹝卜﹞
<font color='#f00'>ㄅㄨˇ</font><br>
[名]<br>
1.古人灼燒龜甲或牛骨，辨視其裂紋以推斷事情吉凶的行為。如：「占卜」、「龜卜」。<br>
2.泛指一般預測吉凶的方法。如：「卜卦」。清．王漁洋〈灞橋寄內〉詩二首之二：「閨中若問金錢卜，秋雨秋風過灞橋。」<br>
3.掌管問卜之事的人。《楚辭．屈原．卜居》：「心煩慮亂，不知所從，往見太卜鄭詹尹。」《禮記．王制》：「凡執技以事上者，祝史射御醫卜及百工。」<br>
4.古劇角色名稱。飾演老婦人，如今戲中的老旦。如：「卜兒」。《永樂大典戲文三種．宦門子弟錯立身．第五出》：「（末卜商量介）萬事不由人計較，一生都是命安排。」<br>
5.姓。如春秋時衛國有卜商，清代有卜舜牟。<br>
6.二一四部首之一。<br>
<br>
[動]<br>
1.灼龜占卦。《左傳．僖公四年》：「初，晉獻公欲以驪姬為夫人，卜之不吉。」<br>
2.預料、事先推斷。如：「未卜先知」、「勝敗可卜」。《史記．卷六五．孫子吳起傳》：「試延以公主，起有留心則必受之，無留心則必辭矣。以此卜之。」<br>
3.選擇。如：「卜居」、「卜鄰」。《左傳．昭公三年》：「非宅是卜，唯鄰是卜。」宋．陸游〈呂從事夫人方氏墓誌銘〉：「以潦水齧墓趾，改卜於舊墓少東二百步。」

```
<br>



<br>

---

字典如果有發現錯誤，歡迎回報。

<a href="https://www.buymeacoffee.com/hsuan" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 165px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

