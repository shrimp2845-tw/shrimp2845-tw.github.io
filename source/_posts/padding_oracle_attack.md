---

title: Padding Oracle Attack
date: 2026-06-01 16:24:32
description: CBC填充預言機攻擊學習筆記和python復刻
tags: 

--- 
## 1.Padding Oracle Attack
填充預言機攻擊 (Padding Oracle Attack)，是一種針對CBC模式下的塊加密算法的側信道攻擊方法，攻擊者能在**完全不知道密鑰**的情況下，利用解密時移除padding所導致的錯誤訊息、徵兆，一個byte一個byte的還原出原始信息