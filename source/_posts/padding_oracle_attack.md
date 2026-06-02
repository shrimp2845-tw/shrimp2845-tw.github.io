---

title: Padding Oracle Attack
date: 2026-06-01 16:24:32
description: CBC填充預言機攻擊學習筆記和python復刻
tags: 

--- 
## 1.Padding Oracle Attack？
填充預言機攻擊 (Padding Oracle Attack)，是一種針對CBC模式下的塊加密算法的側信道攻擊方法，攻擊者能在**完全不知道密鑰**的情況下，利用解密時移除padding所導致的錯誤訊息、徵兆，一個byte一個byte的還原出原始信息。

## 2.填充
填充 (padding)，指的是將明文填充成一個固定長度，由於區塊加密的明文輸入是固定大小，但明文的大小是多少都有可能，這裡用PKCS#7當作範例：

每個填充字節的值是用於填充的字節數，即是說，若需要填充 N 個字節，則每個填充字節值都是 N 。 填充的字節數取決於算法可以處理的最小數據塊的字節數量
```
01
02 02
03 03 03
04 04 04 04
05 05 05 05 05
etc.
```
範例如下：Block 大小為 8 Byte，需要填充 4 Byte（以十六進位表示）
```
DD DD DD DD 04 04 04 04 
```
這樣只要看資料末尾就知道要移除幾byte了，那如果最後發現要移除的那些byte跟最後一個byte不一樣，移除時就會觸發例外情況，大部分的加密庫會回報錯誤。 (如`pycryptodome`會raise ValueError)

## 3.原理
### 1.條件
這種攻擊需要兩個條件：

- 1.已知用`k`作為密鑰的CBC塊加密的密文以及其`IV`
- 2.一個能告訴你如果任何輸入合法的`IV`和`ciphertext`在用`k`解密後其填充是否合法的機器 (oracle)

這聽起來很不現實，攻擊者甚至在全程不知道密鑰的情況，就能還原出密文。

### 2.構造合法密文
這裡示範用AES-CBC (每個block 16 bytes)
還原的過程是一塊一塊進行，假如要破解`Ci`這個block，我們先構造一個任意16bytes的資料`R = r1 r2 r3 ...... r16`
，然後問oracle： `iv = R`, `ciphertext = Ci`的填充是否合法，如果合法就進入下一步，如果不合法就替換`R`的最後一個byte, 因為`P = D(Ci)⊕R `，而如果將`R`的最後一個byte的255種可能都嘗試過後表示`P`也是255種都試過了(只要最後一個byte是01就包準可以），所以一定存在填充合法的`R`。

### 3.檢查填充長度
已知`P = D(Ci)⊕R`的填充合法，那就表示`P`
一定是像：
```
DD DD DD ........ DD 01
DD DD ....... DD 02 02
DD DD ........ 03 03 03
```
的這種格式，那要確定是哪一種呢？

我們知道只要對`R`的byte做XOR, `P`也會發生一樣的事情，因此假設`P = p1 p2 p3 ...... 03 03 03`，`R = r1 r2 r3 ...... r16`:

-  `iv = R`, `ciphertext = Ci`  oracle會回傳合法填充
- 接著修改`r1' = r1⊕01` 
- 那`P = p1' p2 p3 ...... 03 03 03`
-  `iv = R'`, `ciphertext = Ci`  oracle會回傳合法填充所以繼續修改`r2`
- 如果還是回傳合法就以此類推繼續修改`r3`
- 直到`r14' = r14⊕01`
- 那`P = p1' p2' p3' ...... 02 03 03`
- `iv = R'`, `ciphertext = Ci`  oracle就會變成回傳不合法填充

因為修改了倒數第三位導致填充不合法，所以填充長度為三，且最後3個bytes都是`03`

### 4.獲得部分原文和擴展
其實這時我們已經還原出padding部分的密文了，用剛剛的例子`P = p1 p2 p3 ...... 03 03 03`，`R = r1 r2 r3 ...... r16`：

由於已知`P = D(Ci)⊕R`的最後三byte都是`03`而我們真的想知道的明文是`Pi = D(Ci) ⊕ Ci-1` (如果`i = 1`, `Ci-1 = iv`)，而XOR滿足交換率：

`P⊕R = D(Ci)`，所以`Pi = P⊕R⊕Ci-1`，
又`Pi`的末三位都是`03`，因此`Pi[-3:] = (03 03 03)⊕R[-3:]⊕Ci-1[-3:]`就是`Pi`的末3bytes。

那既然如此我們只要把`P`變成`10 10 10 ...... 10 10 10`就能獲得`Pi`的末16bytes，也就是完整的密文了。

一樣用剛剛的例子`P = p1 p2 p3 ...... 03 03 03`，`R = r1 r2 r3 ...... r16`，而且這次我們已經知道`P`的末3bytes是`03 03 03`了，那如果我們只需要對`r14, r15, r16`進行`ri' = ri ⊕ 03 ⊕ 04`，那`p14' ,p15', p16' = 04, 04, 04`，再來就對`r13`一樣嘗試每一種可能直到`p13 = 04`時再把`p13, p14, p15, p16`用剛剛提到的方法變成`05 05 05 05`，就可以反覆執行下去直到`P`變成`10 10 10 ...... 10 10 10`，再用`Pi = (10, 10, 10 ...... 10, 10, 10) ⊕ R ⊕ Ci-1`，就大功告成了！

## 4.python implement
 ```python
 import os
import random
from project_AES import AES
from project_AES.configs import AESConfig
from project_AES import block_utils

class Vulnerable_AES:
    def __init__(self, secret = os.urandom(random.randint(30, 150)).hex()):
        self.__secret = secret
        self.__cipher = AES(os.urandom(16), mode='cbc')

    def get_encrypted_secret(self):
        return self.__cipher.encrypt(bytes.fromhex(self.__secret)).hex()

    def check_your_secret(self, ct: str):
        try:
            if self.__cipher.decrypt(bytes.fromhex(ct)).hex() == self.__secret:
                return 'ohhi!'
            else:
                return 'ohhi?'
        except Exception as e:
            return f'error : {e}'

    def check_raw(self, raw):
        if raw == self.__secret:
            print('how is this possible!!! QAQ')
        else:
            print('awa why so weak')

def xor(b1: bytes, b2: bytes) -> bytes:
    return bytes(i ^ j for i, j in zip(b1, b2))

def get_info(s):
    res = []
    for i in range(len(s) // 32):
        res.append(s[i*32: i*32+32])
    return res

def find_valid_padding(r, c, idx):
    c = bytes.fromhex(c)
    if target.check_your_secret((r+c).hex()) == 'error : remove_padding: invalid padding' and idx != 0:
        print('error')
        raise
    if idx != 0:
        nr = r[:16-idx]+xor(xor(r[16-idx:], (idx.to_bytes())*idx), ((idx+1).to_bytes())*idx)
    else:
        nr = r
    for i in range(256):
        nb = xor(nr, i.to_bytes().rjust(16-idx, b'\x00') + (b'\x00' * idx))
        if target.check_your_secret((nb+c).hex()) != 'error : remove_padding: invalid padding':
            return nb
    return 'done'

def check_padding_len(r, c):
    c = bytes.fromhex(c)
    if target.check_your_secret((r+c).hex()) == 'error : remove_padding: invalid padding':
        return 0
    for i in range(16):
        nr = r[:i] + xor((1).to_bytes(), r[i].to_bytes()) + r[i+1:]
        if target.check_your_secret((nr+c).hex()) == 'error : remove_padding: invalid padding':
            return 16 - i
    return 'done'

def attack_block(block, iv):
    idx = 0
    n = bytes.fromhex('0'*32)
    while True:
        n = find_valid_padding(n, block, idx)
        print(f'round1:{idx}', n.hex())
        if idx == 15:
            re = xor(n, b'\x10' * 16).hex()
            print("result =", xor(bytes.fromhex(re), bytes.fromhex(iv)).hex())
            return xor(bytes.fromhex(re), bytes.fromhex(iv)).hex()
        if idx == 0:
            idx = check_padding_len(n, block)
        else:
            idx += 1
        

secret = """it's a long way forward, trust in me
I'll give them shelter, like you've done for me
And I know, I'm not alone, you'll be watching over us
Until......"""
target = Vulnerable_AES(secret = secret.encode().hex())

def main():
    print(target.check_your_secret(target.get_encrypted_secret()))
    blocks = get_info(target.get_encrypted_secret())
    iv, blocks = blocks[0], blocks[1:]
    print('iv:', iv)
    v = iv
    plaintext = []
    for j, i in enumerate(blocks):
        print(f'-----------------------block {j+1}-----------------------')
        plaintext.append(attack_block(i, v))
        v = i
    pl = block_utils.remove_padding(bytes.fromhex(''.join(plaintext)))
    print('ans: ', pl.decode())
    print('check:')
    target.check_raw(pl.hex())
    
if __name__ == '__main__':
    main()
 ```
### 1.VulnerableAES()
模擬一個真實世界中具有漏洞的 Web API 或服務。
 
 `get_encrypted_secret()`： 回傳加密後的密文。
 
 ``check_your_secret(ct)`：
 這是整個攻擊的oracle。當我們傳入構造的密文時，它會進行解密。如果填充錯誤，會拋出錯誤訊息。
 
### 2.攻擊函數

​`check_padding_len(r, c)`：

確認當前的填充長度，​當我們構造出一個合法的 `R` 讓解密成功時，去探測此時的明文末尾到底是 `01`、`02 02`還是 `03 03 03`。

`find_valid_padding(r, c, idx)`：

這個函數負責動態調整 `R`

已知前一個狀態的填充長度為 `idx`  (例如末尾已經是 `01`)，為了猜測前一個 byte，把末尾調整為期待的下一個填充值(例如 `02 02`)。
接著，程式針對未知的第 16 - idx 個位置，從 0 到 255 進行爆破，直到oracle不報錯為止。

`attack_block(block, iv)`：

這個函數負責對單個密文區塊進行破解。

​重複執行`find_valid_padding`調整`R`和`idx+=1`調整爆破的byte (如果在round 0, idx有很低的機率直接跳到2或更高，所以要呼叫`check_padding_len`)，直到爆破出`P = D(Ci)⊕R = (10 10 10 ...... 10 10 10)`為止並回傳`Pi = (10, 10, 10 ...... 10, 10, 10) ⊕ R ⊕ Ci-1`也就是這個block的明文。

### 3.main()
對每個block調用`attack_block(block, iv)`，拼接原文後移除正常應有的填充，並且向`VulnerableAES()`驗證攻擊是否成功。

## 5.現代世界如何防範
其實現實世界也有發生過數起這種類型的漏洞：
- 1.微軟 ASP.NET 視圖狀態洩漏 (CVE-2010-3332 / MS10-070)
- 2. Apache Shiro 記憶體偽造 (CVE-2019-12422 / Shiro-721)
- 3. POODLE 攻擊 (CVE-2014-3566)

這些資安漏洞雖然都不只用到填充攻擊，但其都是攻擊鏈中重要的一環 (別叫我解釋，我是真看不懂QwQ)

現在解決這個問題主流的防法是放棄CBC，或者使用MAC驗證信息完整性。

切記，**加密不是驗證**，傳統的CBC無法驗證信息是否被修改，現在AES加密更常使用GCM模式 (用ghash進行驗證的CTR模式)，
這種帶驗證的模式能檢測出密文是否被竄改，進直接暫停解密，讓攻擊者難以獲取需要的信息，如果執意要用CBC也會加上HMAC，一樣能在解密前驗證信息完整性。

