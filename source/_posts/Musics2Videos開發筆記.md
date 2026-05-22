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

## 3.日誌
完成度(實時更新)
```
Directory structure:
└── Musics2Video/
    └── musics2video/
        ├── 🟢__init__.py
        ├── __main__.py
        ├── 🟡configs.py
        ├── 🟢logger.py
        ├── m2v.py
        ├── renderer/
        │   ├── 🟢__init__.py
        │   └── html2image_renderer.py
        ├── templates/
        │   └── classic/
        │       ├── style.css
        │       └── template.html
        └── video_utils/
            ├── 🟢__init__.py
            ├── 🟢download.py
            ├── generate_img.py
            ├── 🟢get_title.py
            └── merge.py
 ```
 `date: 2026/5/22`
 
 完成了download.py, get_title.py, logger.py
 configs.py在開發過程中會持續新增需求
 
 ### download.py
 ```py
 import os
import sys
from tqdm import tqdm
import subprocess
from ..logger import get_logger, setup_logging
from ..configs import M2VConfig
from .get_title import get_title

def download_one(url: str, name: str, config: M2VConfig = M2VConfig()) -> str:
    title = get_title(url, config = config)
    cmd = ['yt-dlp',
            '--quiet',
            '--no-progress',
            '--no-warnings',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', str(config.audio_quality),
            '-o', config.temp_dir + name,
            url]
    subprocess.run(cmd, check = True)
    return title

def download_musics(urls: list[str], config: M2VConfig = M2VConfig()) -> list[tuple[str, str]]:
    """
    download all musics and return a list[tuple[file_name, music name]]
    """
    setup_logging(level = config.level, name = 'download')
    logger = get_logger(__name__)
    try:
        logger.info('start downloading audios')
        if config.level not in ('WARNING', 'ERROR', 'CRITICAL'):
            que = tqdm(urls)
        else:
            que = urls
        titles = []    
        for i, j in enumerate(que, start = 1):
            titles.append((str(i)+'.mp3', download_one(j, str(i)+'.mp3', config)))
        return titles
    except Exception as e:
        logger.error(e)
        sys.exit(1)
 ```
 
### get_title.py
```py
import sys
from urllib.parse import urlparse, parse_qs
from ytmusicapi import YTMusic
from yt_dlp import YoutubeDL
from ..logger import get_logger, setup_logging
from ..configs import M2VConfig

LOGGER = None

def sanitize(name: str) -> str:
    if len(name) < 45:
        return name
    return name[:40] + '......'
    
def get_all_name(url: str) -> str:
    ydl_opts = {'quiet': True,
            'skip_download': True,
            'no_warnings': True}
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download = False)
    return info.get('title')
    
def get_yt_name(url: str) -> str | None:
    url = url.strip()
    ytm = YTMusic()
    video_id = None
    parsed_url = urlparse(url)
    if 'youtube.com' in parsed_url.netloc:
        query_params = parse_qs(parsed_url.query)
        if 'v' in query_params:
             video_id = query_params['v'][0]
    elif 'youtu.be' in parsed_url.netloc:
        video_id = parsed_url.path.strip('/')
    if not video_id or len(video_id) != 11:
        return None
    track_info = ytm.get_song(video_id)
    video_details = track_info.get('videoDetails', {})       
    song_title = video_details.get('title')
    artist = video_details.get('author')
    if artist and song_title:
        return f'{song_title} - {artist}'
    return None
    
def get_title(url: str, config: M2VConfig = M2VConfig()) -> str:
    setup_logging(level = config.level, name = 'get_title')
    logger = get_logger(__name__)
    try:
        name = get_yt_name(url)
        if not name:
            name = get_all_name(url)
        return sanitize(name)
    except Exception as e:
        logger.error(e)
        sys.exit(1)
```
### logger.py
```py
import logging
from pathlib import Path

def setup_logging(level: str = "INFO", name: str = 'undifined'):
    level_dict = {"DEBUG": logging.DEBUG,
            "INFO": logging.INFO,
            "WARNING": logging.WARNING,
            "ERROR": logging.ERROR,
            "CRITICAL": logging.CRITICAL}
    logging.basicConfig(level = level_dict[level.upper()],
            format = f"[{name}] [%(levelname)s]: %(message)s")

def get_logger(name: str):
    return logging.getLogger(name)
```
