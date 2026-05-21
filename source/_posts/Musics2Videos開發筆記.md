---

title: Musics2Video開發筆記
date: 2026-05-21 10:30:12
description:  新專案的開發日誌，持續更新中
tags: 
--- 

## 1. 動機
`date: 2026/5/20`

會想寫這個專案是因為剛好Spotify 過期了
，再用yt聽歌的時候突然有一個想法，有沒有一種工具可以生成那種一兩小時的作業用音樂影片，結果發現網路上好像沒有這種功能的開源工具 (其實連能用的都沒怎麼發現)，最近又剛好完成了這個blog，所以就拿這篇當我的開發日記啦！預計會繼續更新！

## 2. 專案草圖
`date: 2026/5/21`
第一版：
```md
## about

這是一個用來生成像是https://youtu.be/_QIAj-xiWpo這種影片的工具

## structure

Musics2Video:
    各種文件,測試
    musics2video:
        __main__
        __init__      
        m2v.py
        configs.py
        video_utils:
            __init__
            download.py
            generate_pictures.py
            merge.py
        template:
            __init__
            img:
                template.py用來生成模板的資源
            templates.py 
            
## dependency 
- pillow
- yt-dlp
- ffmpeg
- tqdm
```
我想了一下覺得pillow做模板雖然簡單但沒什麼彈性，所以我想或許可以用html+css渲染成圖片，這樣未來有人想貢獻模板難度也會低很多。

第二版：
```md
## about

這是一個用來生成像是https://youtu.be/_QIAj-xiWpo這種影片的工具

## structure

Musics2Video:
    各種文件,測試
    musics2video:
        __main__
        __init__
        m2v.py
        configs.py
        
        renderer:
            __init__
            html2image_renderer.py
            
        video_utils:
            __init__
            merge.py
            download.py
            generate_img.py
            
        templates:
            包含多種主題，這邊只舉一種
            classic:
                template.html
                style.css
                  
## dependency 
- html2image
- Jinja2
- yt-dlp
- ffmpeg
- tqdm
```