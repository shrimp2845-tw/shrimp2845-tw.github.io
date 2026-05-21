---

title: project_DES(下)
date: 2026-05-20 10:25:30
description:  project_DES的整體程式架構，以及基礎的區塊加密模式（ECB, CBC)
tags: 
--- 
## 1. 核心程式架構
在[project_DES(上)](https://shrimp2845-tw.github.io/project_DES_%E4%B8%8A/)我們討論了DES的核心架構，這邊將概略講解project_DES的核心架構([des_core](https://github.com/shrimp2845-tw/project_DES/tree/main/project_DES/des_core))。
```
  des_core/
       ├── __init__.py
       ├── bit_utils.py
       ├── crypto.py
       ├── feistel.py
       ├── key.py
       ├── mangler.py
       └── permute.py
 ```
### 1. 資料輸入與初始轉換
​當輸入一個 8 位元組（64 bits）的資料時，`bit_utils.bytes_to_bits()` 會先把bytes string轉成由 0 和 1 組成的 Python 串列，接著進行`crypto.ip()` (inverse initial permutation)。

### 2. key schedule 
與此同時，`key.generate_round_key()` 會吃進 8 位元組的主密鑰，然後延伸出16組48位元的輪密鑰。

### ​3. 16 輪的 Feistel 網路
​經過步驟一的 64 位元資料進行:
`output = feistel.feistel(input, 輪密鑰*16, magler.f)`
(若是要加密：`輪密鑰*16 = key.generate_round_key(主密鑰)`，若是解密：`輪密鑰*16 = key.generate_round_key(主密鑰)[::-1]`)

### 4. 末尾置換與輸出
將經過步驟三的資料進行`crtpto.fp()`(inverse initial permutation)，輸出在用`bit_utils.bits_to_bytes()`變回bytes string，即是完成加密/解密後的資料

## 2. 高層資料處理和基礎的分組加密模式
這邊將概略講解project_DES的高層架構 ([project_DES](https://github.com/shrimp2845-tw/project_DES/tree/main/project_DES))和基礎的塊區塊加密模式，畢竟DES演算法只能處理剛好64bit的資料，因此真的要用來加密數據的話，還有一些其他準備要做。
(註：接下來的講解僅限於ECB, CBC，一些其他的模式(像是CTR就不需要進行填充也不需要切塊)的整體架構和這兩種有很大差異)
### 1. 填充和切塊
我實作是用`pkcs#5`填充，填充的意義是將資料填充成區塊大小(DES是64bit)的倍數大小。

(註：其實`pkcs#5`是`pkcs#7`在區塊大小等於64bit時的特例，算是`pkcs#7`的子集，所以使用`pkcs#7`也是一模一樣的效果)

因為資料真正在處理的單位並不是bit而是byte (8bit)，所以我們要把數據填充成8bytes的倍數，方法並不是填`0x00`，畢竟如果原資料的最後一個byte也是`0x00`，就不知道拆除填充時要拆掉幾個byte了，所以填充的資料是：
`bytes(8 - (原資料大小 % 8)) * 8 - (原資料大小 % 8)`

(註： 有一個特例是如果(原資料大小 % 8) = 0，那必須改成填充`0x08`*8而不是不填充)

如果是加密將這串資料加在檔案的尾端即可，如果是解密則不需要這個步驟。

再來要把資料切成好幾塊和區塊大小等大的多個區塊，然後儲存成Python list。

### 2.加密/解密
再來用選擇的模式進行加密或解密，這次的實作我只有設計ECB和CBC。

#### ECB (Electronic Codebook)
![](./images/ecb_e.png)
![](./images/ecb_d.png)
ECB就是最基本的將每個區塊直接用DES進行加密/解密輸出。
缺點也同樣的明顯，如果有兩個區塊一模一樣，就會被加密成一模一樣的東西，所以在重複性高的資料就很容易暴露統計特徵，而且只要是一樣的資料就一定會被加密成一樣的東西，例如「夢幻之星線上：藍色脈衝」線上電子遊戲使用ECB模式的Blowfish密碼。作弊者通過重複傳送加密的「殺死怪物」訊息包以非法的快速增加經驗值。

#### CBC (Cipher Block Chaining)
![](./images/cbc_e.png)
![](./images/cbc_d.png)
而CBC每個明文塊先與前一個密文塊進行互斥或後，再進行加密。在這種方法中，每個密文塊都依賴於它前面的所有明文塊。同時，為了保證每條訊息的唯一性，在第一個塊中需要使用`iv`(initialize vector)。
缺點是因為加密時處理每個區塊都要求前一個區塊已經處理完畢，所以導致加密過程無法多核心並行(就不能用gpu加速加密過程)。

### 3.合成和去除填充
再來就把加密/解密過後的多個資料塊組合成一整個，如果是解密的話，就還要去除填充，而方法就是在資料尾部移除資料最後一個byte個bytes。
(註：移除時也要檢查填充是否合法，不合法大概率是密鑰錯了)

處理完的資料就是加密/解密過後過的資料了。

## 3.結尾
​這些就是用DES加密資料的完整流程了，不知道講解的夠不夠清楚，開發這個專案讓我也學到不少，像是基礎的密碼學知識和開發python module的流程等等，這也是我第一次完整的寫出一個能讓別人用的module，當下成功`pip install project-des`的時候真的蠻感動的w，之後應該會寫怎麼部署/發布自己的模組到pypi上的教學，那就敬請期待囉。
