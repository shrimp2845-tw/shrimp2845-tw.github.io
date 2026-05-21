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
```md
## about

這是一個用來生成像是https://youtu.be/_QIAj-xiWpo影片的工具

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

## job handle
`__main__`：讓使用者可以在cmd運行 `musics2video arg1 arg2......`

`configs.py`：提供`m2v_config`類別

`download.py`：給予一堆video link下載音訊(停用logging輸出)和記錄下歌名，如果過長則擷取一部分然後在後面加上`......`

`templats.py`：提供多種模板函式，每個模板接受`cover_img、list[song_nams]`，生成一張通用圖片，並回傳每個歌名在圖片的位置等等

`generate_pictures.py`：根據templats.py生成的圖片和其他參數(高亮歌名、箭頭標示現在歌名)，生成每一首歌的封面

`merge.py`：把所有封面圖和音訊合成

`m2v.py`：高層級api，會根據`m2v_config`建立一個叫`m2v`的class，會有各種功能，包括自定義輸出檔名，用本地影片、音訊而不從yt下載的模式，自訂temp資料夾名稱，是否即時輸出logging(進度條、完成提示等等)，基本的音訊品質等等還有很多
```

