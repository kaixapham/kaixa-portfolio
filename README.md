# kaixa Portfolio

Bản xem thử công khai của portfolio Kaixa (Dung Pham). Trang tĩnh, không
framework, không build step.

Xem trực tiếp: https://kaixapham.github.io/kaixa-portfolio

| Trang | File |
|---|---|
| Loading → Home | `index.html` (màn loading, xong thì sang Home) |
| Home | `home.html` |
| Works | `works.html` |
| Work Detail (Lumen Studio) | `work-detail.html` |
| About | `about.html` |
| Contact (Hello, Mate) | `index.html` — mở lại lần hai trong cùng phiên |

## Chạy ở máy

```bash
node serve.mjs 4200
```

Phải mở qua server tĩnh, không mở thẳng `file://` — trang dùng `fetch` cho font
và WebGL đọc texture từ ảnh.

## Phím tắt khi xem

- `H` — bảng setting của trang (chỉ để xem số; nút Lưu chỉ chạy trên máy)
- `G` — lưới 12 cột
- `K` (Home) — bảng chỉnh máy CD 3D
