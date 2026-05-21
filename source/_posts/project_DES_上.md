---

title: project_DES(上)
date: 2026-05-20 07:24:34
description: DES的演算邏輯講解
tags: 

--- 

## 1.動機

高一那年算是我第一次對密碼學有興趣，也花了一兩天的時間用python復刻二戰時期德國的加密機器[恩格瑪機](https://github.com/shrimp2845-tw/Enigma)，而在完成這份專案後我開始好奇，現代的加密是怎麼樣的呢?畢竟不可能像古典密碼學那樣針對英文字母做加解密，在探索的過程中，我發現了現代對稱加密的先驅:**DES**演算法。



## 2.歷史

**DES** (Data Encryption Standard)是一種是一種對稱金鑰加密塊密碼演算法，1976年被美國聯邦政府的國家標準局確定為聯邦資料處理標準，隨後在國際上廣泛流傳開來。

雖然隨著運算能力提升，DES 的 56 位元金鑰變得能被暴力破解(使用RTX3070進行加速的話大約需要215天，如果是特殊設計的機器不下幾個小時就能破解 ([source](https://www.researchgate.net/publication/357937815_Key_lengths_revisited_GPU-based_brute_force_cryptanalysis_of_DES_3DES_and_PRESENT)))，但是作為第一個公開的對稱加密算法，吸引了很多嘗試破解、弄清楚國安局有沒有暗藏後門的各路人士開始加入密碼學的研究，而隨後替代他的**AES** (Advance Encryption Standard)演算法，在設計中也相當程度的參考了DES，實際上後來出現的一系列其他的對稱加密算法，或多或少都借鏡了DES，因此，DES在現代密碼學的意義，其實早就超出了算法本身。



## 3.演算法邏輯

我在理解原理的方面是看[Neso Academy-Data Encryption Standard(DES)](https://www.youtube.com/watch?v=8l9xAvuGJFo&list=PLBlnK6fEyqRiOCCDSdi6Ok_8PU2f_nkuf)的一系列教學影片學習的，這裡我會試著用我的話來講解清楚。

### 1. Feistel Structure

Feistel Structure 是一種用於構建對稱區塊加密算法的結構，其演算邏輯如圖:

![feistel](./images/feistel.png)

(註:實際上Feistel Structure並沒有硬性規定輪數，但這裡使用官方文檔和為了解說方便圖中的是DES所使用的16輪)

`L0, R0`: 將input 拆分成等長的左右兩部分

`K1 ~ K16`: 輪密鑰，每個都是固定長度的不同資料

`f()`: 輪函數，`f(input, round_key) = output`，input 和 output長度相同

`Ꚛ`: 異或運算(xor)

仔細觀察就可以發現這種設計的巧妙之處:

`plain = feistel(input=feistel(input=plain, round_keys=K1~K16), round_keys=K16~K1)`

因此加解密使用同一套算法不過`round_keys`順序相反罷了，所以即使`f()`不可逆，整體算法仍然可逆。

### 2. Mangler Function

Mangler Function 是DES所採用的輪函數，其概略演算邏輯如圖:

![](./images/mangler.png)

以下是拆分成各個步驟的解釋:

#### 1. expand permutation (ep)

`ep()`會將32bit的輸入，擴展成48bit的輸出，其運作邏輯如下:

![](./images/ep.png)

將原資料用上表的索引填入(例如:` output[1] = input[32], output[2] = input[1], output[15] = input[10]`)，嘿對，就是這麼樸實無華。

#### 2. xor

接著和48bit的輪密鑰(接下來會討論輪密鑰的生成)進行異或運算。

#### 3. s-box

`s-box()`會將48bit的數據變回32bit，同時這是整個算法唯一的非線性運算，可以說是整個演算法在統計上不會完全崩塌的重大功臣。

首先，輸入會被拆成8個6bit的資料，我們叫它們`d1 ~ d8`，而`s-box()`也由8個小函式`s1() ~ s8()`組成，每個`si()`接收6bit並且輸出4bit的資料，整體流程就是:

`output = s-box(input) = s1(d1)|s2(d2)|......|s7(d7)|s8(d8)`

`si`的運作邏輯如下:

![](./images/sbox.png)

每個`di`都是6bit，因此我們把它拆成`di = b1 b2 b3 b4 b5 b6`

接著，`b1 b6`當縱軸，`b2 b3 b4 b5`當橫軸，拿去查表(上圖是`s1()`的表，每個`si()`都有自己的表)，查到的值就是輸出。

#### 4. p-box

`p-box()`會將32bit的輸入，查表打亂，其運作邏輯如下:

![](./images/pbox.png)

將原資料用上表的索引填入(例如: `output[1] = input[16], output[2] = input[7], output[15] = input[31]`)

### 3. Key Schedule

再來我們要來探討這16輪的輪密鑰是如何產生的，其概略演算邏輯如圖:

![](./images/key.png)

#### 1. permuted choice 1 (pc1)

`pc1()`會將64bit的`key`(演算法使用的密鑰)，變成兩個28bit的`C0`, `D0`，

其中，8的倍數bit會被捨棄，這也是為什麼DES的密鑰真實長度是56bit而不是64bit，其運作邏輯如下:

![](./images/pc1.png)

將原資料用上表的索引填入，上半部分是`C0`，下半部分是 `D0`。

#### 2. left shifts (lcs)

`lcs()`是將原本`b1 b2 ...... b27 b28` 變成 `b2 b3 ...... b28 b1`的這個操作根據現在的回合重複指定次數，其中除了第1, 2, 9, 16輪做1次以外，其餘輪數都做2次。



#### 3. permuted choice 2 (pc2)

`pc2()`會將56bit的資料(`C0 | D0`)變成48bit的輪密鑰，其運作邏輯如下:

![](./images/pc2.png)

將原資料用上表的索引填入(例如: `output[1] = input[14], output[2] = input[17], output[15] = input[12]`)

### 4. Final Step!

最後將上述的零件組起來就好了，其運作邏輯如下:

![](./images/DES.png)

其中將`round_keys`反序就是解密。

#### 1. initial permutation (ip)

`ip()`會將64bit的輸入，查表打亂，其運作邏輯如下:

![](./images/ip.png)

將原資料用上表的索引填入(例如: `output[1] = input[58], output[2] = input[50], output[15] = input[12]`)

#### 2. inverse initial permutation (inv_ip)

`inv_ip`是`ip()`的逆向操作(`input = inv_ip(ip(input))`)，其運作邏輯如下:

![](./images/iip.png)

將原資料用上表的索引填入(例如: `output[1] = input[40], output[2] = input[8], output[15] = input[63]`)

## 4.結尾
這些就是DES的運作邏輯了，不過這個樣子還不能真的加密資料，你會發現現在的演算法只能接受64bit的資料，但真正加密的資料可不是固定大小的，所以下一篇我們會討論要怎麼真的用DES進行加密，那就敬請期待囉。
