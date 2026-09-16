# kaixa Portfolio — (Hello, Mate)

Bản xem thử của trang liên hệ (Hello, Mate). Một trang tĩnh, không framework,
không build step.

Xem trực tiếp: https://kaixapham.github.io/kaixa-portfolio

## Chạy ở máy

```bash
node serve.mjs 4200
```

Phải mở qua server tĩnh, không mở thẳng `file://` — trang dùng `fetch` cho font
và WebGL đọc texture từ ảnh.

## Có gì trong này

| File | Việc |
|---|---|
| `kx-hello-mate.js` | Nhập & phát nhạc, sound bar theo nhạc, 2 đĩa xoay, cột chữ chạy loop |
| `kx-disc-fx.js` | Bóp méo vành đĩa khi rê chuột (WebGL, 8 preset) |
| `kx-tail-cursor.js` | Con trỏ có đuôi ruy-băng (canvas 2D) |
| `kx-shuffle-text.js` | Xáo kí tự cho chữ mono lúc trang vừa hiện |
| `kx-block-reveal.js` | Thanh khối quét ngang để lộ chữ, ảnh, ô PLAY/MUTE |
| `kx-loading.js` | Màn loading — số %, hàng nhãn, hai poster |
| `kx-page-transition.js` | Lưới pixel quét ngang lúc loading bàn giao cho trang chính |
| `kx-blaze.js` / `kx-burn-image.js` / `kx-fire-edge.js` | Ba cơ chế lửa |
| `kx-burning-mode.js` / `kx-burning-open.js` | Nút BURNING MODE và màn mở đầu |

Không dùng thư viện ngoài nào — mọi hiệu ứng viết tay bằng WebGL, canvas 2D và
`requestAnimationFrame`.

## Font

- **Geist Mono** — OFL.
- **BT Danta** — dùng cho số phần trăm ở màn loading.
- **PP Editorial New Thin** — font thương mại của Pangram Pangram, dùng theo
  license đã mua.

## Nhạc

`triumph-of-light.mp3` sinh bằng Suno, không vướng bản quyền.

Bản xem thử này đã bỏ bớt vài ảnh so với bản làm việc, và ảnh poster được thu
nhỏ lại cho nhẹ.
