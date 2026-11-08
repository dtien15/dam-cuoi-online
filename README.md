# Đám Cưới Online 💒

Game đám cưới tương tác cho **TikTok LIVE**, miễn phí. Khách xem live vào ăn cỗ, tặng quà để làm cô dâu chú rể, cướp dâu, cướp rể, thậm chí hủy hôn, rồi cùng chơi mini game kéo co giữa hai họ. MC, cô dâu và chú rể nói bằng giọng đọc tiếng Việt chạy ngay trên máy bạn, không cần tài khoản hay phí dịch vụ.

> Được chia sẻ bởi kênh **AI Ngơ**.

## Cần chuẩn bị

- Máy tính **Windows 10/11**, nên có RAM từ 8 GB.
- Mạng Internet cho lần cài đầu tiên (tải khoảng 1,5 GB giọng đọc).
- **OBS Studio** và **TikTok LIVE Studio**, hoặc tài khoản được phép live bằng máy tính.

## Cài đặt (làm một lần)

### Bước 1: Tải game

Bấm nút xanh **Code** ở đầu trang này, rồi chọn **Download ZIP**. Chuột phải vào file vừa tải, chọn **Giải nén tất cả** (Extract All) và để ở ổ C, ví dụ `C:\dam-cuoi-online`.

> Đừng chạy game ngay bên trong file zip, phải giải nén ra trước.

### Bước 2: Cài Node.js

Vào [nodejs.org](https://nodejs.org), tải bản **LTS** và cài bằng cách bấm Next đến hết.

### Bước 3: Cài Python

Vào [python.org/downloads](https://www.python.org/downloads/) và tải Python. Đã thử chạy tốt với bản 3.13; cần từ 3.10 trở lên.

> ⚠️ Ở màn hình đầu tiên của trình cài, **phải tích ô `Add python.exe to PATH`**, rồi mới bấm **Install Now**. Quên tích là game không có giọng.

### Bước 4: Chạy game

Bấm đúp vào file **`chay-game.bat`**.

- Nếu Windows hiện bảng màu xanh "Windows protected your PC", bấm **More info** (Thông tin thêm), rồi bấm **Run anyway** (Vẫn chạy).
- Lần đầu, máy tự cài thư viện và giọng đọc, mất vài phút. Xong thì bảng điều khiển tự mở trong trình duyệt.
- **Đừng tắt cửa sổ màu đen** trong lúc live. Tắt nó là game dừng.

### Bước 5: Nối TikTok

Trong bảng điều khiển, ở tab **Kết nối**, gõ `@tên_tài_khoản` TikTok của bạn và bấm **Kết nối**.

### Bước 6: Đưa game vào OBS

1. Trong OBS, ở khung **Nguồn** (Sources), bấm **+**, chọn **Trình duyệt** (Browser).
2. Ô URL dán `http://localhost:3000/`. Có thể bấm **Chép** ở mục *Link màn hình live* trong bảng điều khiển để lấy link.
3. Chỉnh **Rộng 1080**, **Cao 1920**, rồi kéo cho game phủ kín khung hình.
4. Bấm **Bắt đầu máy quay ảo** (Start Virtual Camera).

Ngoài ra có thể nhập sẵn cảnh mẫu: trong OBS chọn **Bộ sưu tập cảnh → Nhập**, rồi chọn file `OBS-Dam-Cuoi-Xom.json`.

### Bước 7: Lên live

Mở TikTok LIVE, phần camera chọn **OBS Virtual Camera**, rồi bấm phát live.

> Máy quay ảo của OBS chỉ truyền hình, không truyền tiếng. Bạn cần chọn nguồn âm thanh trong TikTok LIVE để người xem nghe được MC và nhạc.

## Những lần live sau

Chỉ cần bấm `chay-game.bat`, bật máy quay ảo trong OBS và vào TikTok là xong.

## Cập nhật bản mới

Tải lại file ZIP như Bước 1, giải nén **đè lên thư mục cũ**, rồi bấm `chay-game.bat`. Cài đặt, kịch bản bạn đã sửa và điểm của phiên live vẫn được giữ.

## Khách chơi thế nào

| Khách làm gì | Chuyện gì xảy ra |
|---|---|
| Gõ bình luận, thả tim | Vào bàn tiệc, gọi món, chúc mừng, MC trả lời |
| Tặng **Hoa hồng** (1 xu) | Đăng ký làm **cô dâu** |
| Tặng **GG** (1 xu) | Đăng ký làm **chú rể** |
| Tặng **Finger Heart** (5 xu) | **Cướp dâu**: lên sút cô dâu và thế chỗ |
| Tặng **Peach** (5 xu) | **Cướp rể**: lên sút chú rể và thế chỗ |
| Tặng **Okay** (5 xu) | **Hủy hôn** ngay lập tức |
| Quà khác | Cộng phong bì mừng cưới, MC cảm ơn |
| Gõ `1` hoặc `0` trong mini game | Chọn phe nhà trai hoặc nhà gái để kéo co |

Mỗi lễ cưới chạy khoảng bảy phút: đón khách, rước dâu vào lễ đường, hỏi cưới và trao nhẫn, cắt bánh nâng ly, văn nghệ, mini game, cảm ơn hai họ. Mỗi lễ kể một câu chuyện riêng, và MC, cô dâu, chú rể nói chuyện với nhau bằng giọng riêng.

Quà dùng cho từng sự kiện có thể đổi trong bảng điều khiển.

## Bảng điều khiển

- **Kết nối:** tài khoản TikTok, bật tắt giọng MC, link màn hình live, bắt đầu phiên mới.
- **Âm thanh:** chọn giọng MC, chú rể, cô dâu; chỉnh tốc độ, âm lượng; danh sách nhạc nền (bấm **+ Thêm nhạc** để thêm file MP3).
- **Kịch bản chung:** câu MC nói lúc chúc mừng, đón khách, lúc vắng.
- **Sự kiện:** chọn quà cho cướp dâu, cướp rể, hủy hôn; sửa kịch bản từng cảnh cưới; cài mini game. Mỗi mục có nút **Thử** để xem trước.
- **Kiểm thử:** cho khách ảo vào chơi thử trước khi live thật. Dữ liệu thử không ảnh hưởng phiên live.

## Gặp lỗi?

| Hiện tượng | Cách xử lý |
|---|---|
| "Chua tim thay Node.js" | Cài Node.js (Bước 2), rồi mở lại `chay-game.bat`. |
| "Chua tim thay Python" hoặc game không có giọng | Cài lại Python và nhớ tích ô **Add python.exe to PATH**. |
| Lần đầu cài bị lỗi | Kiểm tra mạng rồi bấm lại `chay-game.bat`; máy sẽ cài tiếp. |
| Mở game trong OBS mà không nghe tiếng | Trình duyệt chặn tự phát tiếng; bấm vào khung game một lần. |
| "Cong 3000 dang bi ung dung khac su dung" | Có chương trình khác đang chiếm cổng 3000; tắt nó hoặc khởi động lại máy. |

## Dành cho người muốn sửa code

```bash
npm ci
npm start
npm test
```

Game là server Node.js (`server.js`) phục vụ trang game (`game/index.html`) và bảng điều khiển (`game/control.html`). Giọng đọc chạy bằng Python trong `tools/vieneu/`. Cài đặt và kịch bản được lưu thành các file JSON cạnh `server.js`; xóa đi là game tạo lại bản mặc định.

## Ghi nguồn

- Giọng đọc: [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) của pnnbao97, giấy phép Apache 2.0.
- Kết nối TikTok LIVE: [tiktok-live-connector](https://github.com/zerodytrash/TikTok-Live-Connector), giấy phép AGPL-3.0. Thư viện này không nằm trong repo; `npm ci` tải nó về khi cài.

Game không phải sản phẩm chính thức của TikTok.

## Giấy phép

Phát hành theo giấy phép [MIT](LICENSE): được dùng, sửa và chia sẻ miễn phí, chỉ cần giữ lại thông báo bản quyền.
