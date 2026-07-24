---
title: shrimp128
date: 2026-07-24 08:00:12
description: 一題我寫的crypto ctf 挑戰
tags: 
--- 

這個幾天後我會把它架設到戰隊的ctfd上面，目前還找不到架netcat伺服器的方法 QwQ

# shrimp128

### hard

I create my own hash function called "shrimp128" cause most of the hash function are so complicated and hard to understand, can u help me test if it is secure? I'll give u the flag as the reward if u can find a collision out of it!

source code:
```py
# MIT License
#
# Copyright (c) 2026 shrimp2845
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import struct
import os
import sys

sys.stdout.reconfigure(line_buffering=True)

def bytes_to_bits(data):
    return [[(i>>j) & 1 for j in range(7, -1, -1)] for i in data]

def bits_to_bytes(data):
    return bytes([int(''.join(map(str, i)), 2) for i in data])

def rot(data):
    return [list(i) for i in zip(*data[::-1])]

def split(data):
    return data[:len(data) // 2], data[len(data) // 2:]

def pad(message):
    orig_len_bits = len(message) * 8
    padded = bytearray(message)
    padded.append(0x80)
    while len(padded) % 64 != 56:
        padded.append(0x00)
    padded.extend(struct.pack("<Q", orig_len_bits))
    return bytes(padded)

def sbox(data):
    # AES S-box
    table = (0x63, 0x7C, 0x77, 0x7B, 0xF2, 0x6B, 0x6F, 0xC5, 0x30, 0x01, 0x67, 0x2B, 0xFE, 0xD7, 0xAB, 0x76,
             0xCA, 0x82, 0xC9, 0x7D, 0xFA, 0x59, 0x47, 0xF0, 0xAD, 0xD4, 0xA2, 0xAF, 0x9C, 0xA4, 0x72, 0xC0,
             0xB7, 0xFD, 0x93, 0x26, 0x36, 0x3F, 0xF7, 0xCC, 0x34, 0xA5, 0xE5, 0xF1, 0x71, 0xD8, 0x31, 0x15,
             0x04, 0xC7, 0x23, 0xC3, 0x18, 0x96, 0x05, 0x9A, 0x07, 0x12, 0x80, 0xE2, 0xEB, 0x27, 0xB2, 0x75,
             0x09, 0x83, 0x2C, 0x1A, 0x1B, 0x6E, 0x5A, 0xA0, 0x52, 0x3B, 0xD6, 0xB3, 0x29, 0xE3, 0x2F, 0x84,
             0x53, 0xD1, 0x00, 0xED, 0x20, 0xFC, 0xB1, 0x5B, 0x6A, 0xCB, 0xBE, 0x39, 0x4A, 0x4C, 0x58, 0xCF,
             0xD0, 0xEF, 0xAA, 0xFB, 0x43, 0x4D, 0x33, 0x85, 0x45, 0xF9, 0x02, 0x7F, 0x50, 0x3C, 0x9F, 0xA8,
             0x51, 0xA3, 0x40, 0x8F, 0x92, 0x9D, 0x38, 0xF5, 0xBC, 0xB6, 0xDA, 0x21, 0x10, 0xFF, 0xF3, 0xD2,
             0xCD, 0x0C, 0x13, 0xEC, 0x5F, 0x97, 0x44, 0x17, 0xC4, 0xA7, 0x7E, 0x3D, 0x64, 0x5D, 0x19, 0x73,
             0x60, 0x81, 0x4F, 0xDC, 0x22, 0x2A, 0x90, 0x88, 0x46, 0xEE, 0xB8, 0x14, 0xDE, 0x5E, 0x0B, 0xDB,
             0xE0, 0x32, 0x3A, 0x0A, 0x49, 0x06, 0x24, 0x5C, 0xC2, 0xD3, 0xAC, 0x62, 0x91, 0x95, 0xE4, 0x79,
             0xE7, 0xC8, 0x37, 0x6D, 0x8D, 0xD5, 0x4E, 0xA9, 0x6C, 0x56, 0xF4, 0xEA, 0x65, 0x7A, 0xAE, 0x08,
             0xBA, 0x78, 0x25, 0x2E, 0x1C, 0xA6, 0xB4, 0xC6, 0xE8, 0xDD, 0x74, 0x1F, 0x4B, 0xBD, 0x8B, 0x8A,
             0x70, 0x3E, 0xB5, 0x66, 0x48, 0x03, 0xF6, 0x0E, 0x61, 0x35, 0x57, 0xB9, 0x86, 0xC1, 0x1D, 0x9E,
             0xE1, 0xF8, 0x98, 0x11, 0x69, 0xD9, 0x8E, 0x94, 0x9B, 0x1E, 0x87, 0xE9, 0xCE, 0x55, 0x28, 0xDF,
             0x8C, 0xA1, 0x89, 0x0D, 0xBF, 0xE6, 0x42, 0x68, 0x41, 0x99, 0x2D, 0x0F, 0xB0, 0x54, 0xBB, 0x16)
    result = table[data]
    return result

def permute(data):
    bits = bytes_to_bits(data)
    b1, b2 = split(bits)
    b1_prime = rot(b1)
    b2_prime = rot(b2)
    b2_top, b2_bottom = split(b2_prime)
    op = b2_top + b1_prime + b2_bottom
    return bits_to_bytes(op)

def shrimp128(message):
    v = bytes.fromhex("2eb7d503a6ac282743036a635a91a92b")
    data = pad(bytes.fromhex(message))
    for i in range(len(data) // 64):
        ivs = data[i*64:i*64+16], data[i*64+16:i*64+32], data[i*64+32:i*64+48], data[i*64+48:i*64+64]
        for j in ivs:
            v = permute(bytes([sbox(a^b) for a, b in zip(v, j)]))
        for j in ivs[::-1]:
            v = permute(bytes([sbox(a^b) for a, b in zip(v, j)]))
    return v.hex()

def main():
    FLAG = 'RCEs{test}'
    print("This is my genius work!! I called it the 'shrimp128'")
    print("Its 128 bits long so there's no way you can find a collision!\n")

    try:
        msg1 = input("Message 1 (hex) > ").strip()
        msg2 = input("Message 2 (hex) > ").strip()
        if bytes.fromhex(msg1) == bytes.fromhex(msg2):
            print("[-] The messages must be different")
            return
        hash1 = shrimp128(msg1)
        hash2 = shrimp128(msg2)
        print(f"Hash 1: {hash1}")
        print(f"Hash 2: {hash2}")

        if hash1 == hash2:
            print(f"\n[+] wow impressive, here's your flag: {FLAG}")
        else:
            print("\n[-] no flag for u :(")

    except Exception as e:
        print(f"\n[-] an error occurred: {e}")

if __name__ == "__main__":
    main()
```