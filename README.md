# Đám cưới xóm mình

Game tương tác TikTok LIVE, khung dọc 1080 × 1920. Bấm `chay-game.bat`, bảng điều khiển **http://localhost:3000/control** tự mở. Khi có bản cập nhật, bấm lại file này là game tự khởi động lại bản mới và giữ điểm phiên; nếu đang nối TikTok thì file hỏi trước.

## Bảng điều khiển

Menu bên trái, xem trước ở giữa, cài đặt bên phải. Màu trắng/xanh, khung xem trước giữ nguyên khi đổi tab.

- **Kết nối:** tài khoản TikTok, âm thanh MC, link/cửa sổ phát live, bắt đầu phiên mới.
- **Âm thanh:** chọn giọng MC, chú rể, cô dâu, tốc độ, âm lượng và danh sách nhạc nền (thêm bài MP3 tối đa 40 MB, đổi tên, đổi thứ tự, xóa; phát lần lượt, hết bài cuối quay lại bài đầu). Các thay đổi này lưu ngay.
- **Kịch bản chung:** chúc mừng, đón khách, lúc vắng, chia sẻ, thả tim và hỏi đáp.
- **Sự kiện:** Quà & đổi vai, Vòng cưới, Mini game. Mỗi mục có cài đặt/kịch bản riêng, nút Thử và một thanh Lưu/Bỏ. Bản nháp được giữ nếu mất kết nối hoặc có người khác sửa.
- **Kiểm thử:** số khách/tim/xu tùy nhập, chọn quà đăng ký/cướp vai, thử tải hàng loạt. Dữ liệu thử tách khỏi live.

Nút **Về live** dưới xem trước thoát phiên thử. Bật tiếng xem trước độc lập với nguồn live.

## Vòng cưới

Tự chạy khoảng bảy phút cộng mini game, mỗi lễ kể trọn một câu chuyện (Chiếc xe đạp tuột xích, Bản hợp đồng hôn nhân, Ba năm yêu xa); ô “Câu chuyện của mỗi lễ” chọn xoay vòng hoặc chỉ dùng một chuyện. Thứ tự cảnh: đón khách → tiến vào lễ đường → hỏi cưới, trao nhẫn → cắt bánh, nâng ly → văn nghệ → mini game → cảm ơn hai họ. MC, chú rể và cô dâu nói chuyện với nhau bằng giọng riêng, chọn trong tab Âm thanh.

Mỗi cảnh có nhiều bản kịch bản, mỗi lễ dùng một bản khác. Sửa ở Sự kiện → Vòng cưới → nút bút chì: đổi người nói, thêm hoặc xóa câu, chèn hiệu ứng, nghe thử, chạy thử đúng bản đang xem. Biến dùng được: `{re}`, `{dau}`, `{le}` (số thứ tự lễ), `{topqua}` (khách mừng nhiều nhất lễ này), `{cuop}` (khách vừa cướp vai); chưa có ai thì bỏ qua câu đó. Nút “Về kịch bản gốc” khôi phục từng cảnh. Cảnh chạy đến khi đọc hết kịch bản; “Giữ cảnh ít nhất” trong hộp sửa là thời gian tối thiểu. Màn hình mất kết nối thì cảnh tự đi tiếp sau vài giây.

Trong nghi lễ MC không đọc lời cảm ơn quà và không trả lời bình luận, chỉ chúc mừng khách cướp dâu, cướp rể. Quà vẫn cộng điểm và hiện trên màn hình. Mặc định MC chỉ cảm ơn quà ở cảnh Đón khách và lúc nghỉ chuyển cảnh; đổi theo từng cảnh bằng ô “MC đọc lời cảm ơn quà trong cảnh này”. Có khách cướp vai giữa lúc đang nói thì câu đó được nói lại với tên mới, lễ không chạy lại từ đầu.

- Hoa hồng (1 xu): đăng ký cô dâu; GG (1 xu): đăng ký chú rể.
- Mỗi tài khoản một chỗ chờ, gửi thêm không tăng số lượt. Đã cưới nghỉ ba lễ.
- Trống vai chọn khách tương tác, tôn trọng giới tính họ đã khai. Không có khách thì dùng máy. Gõ “không cưới” ở cảnh đón để từ chối vai tự chọn.
- Finger Heart (5 xu): cướp dâu; Peach (5 xu): cướp rể. Sút xong mới đổi tên; không khởi động lại lễ. Khi dồn nhiều lượt, giữ hiệu ứng mới nhất mỗi vai, vẫn giữ lời cảm ơn.
- Okay (5 xu): hủy hôn ngay. Khách đi lên, đóng dấu HỦY HÔN, đôi cưới văng ra và sang lễ mới; đôi vừa bị hủy vẫn nghỉ ba lễ. Vừa vào lễ mới 15 giây đầu chưa hủy được; đang mini game thì hết trò mới hủy. Sửa quà, tên trên bảng và lời MC ở Sự kiện → Quà & đổi vai → Hủy hôn.
- Quà khác cộng phong bì và cảm ơn. 1 xu = 10 phong bì, là điểm trò chơi. Sang lễ khác giữ sổ phong bì; chỉ Bắt đầu phiên mới xóa phiên.
- Tim/quà đủ mốc thêm hiệu ứng tim/pháo hoa trong lễ, không mở thêm nghi lễ cũ.

Văn nghệ dùng **bộ bốn nhân vật và nhạc Công viên Lãm Làng cũ**, phát hết bài; MC kết tiết mục rồi vỗ tay. Không còn sự kiện quà 10 xu.

## Khách và mini game

6 bàn × 6 ghế; hai cụm chờ tối đa 12 người hiển thị luân phiên. Người làm dâu/rể nhường ghế. Khách im lâu nhường chỗ khi có người tương tác chờ; quà đã nhận vẫn lưu.

Quà cướp dâu, cướp rể tặng lúc đang mini game vẫn tính điểm cho trò chơi; hết mini game, khách đó mới lên đá và đổi vai, mỗi vai giữ người tặng mới nhất.

Mini game Điểm danh/Kéo co bắt đầu thủ công. Gõ 1/0 chọn phe lúc MC đọc luật; khi thi khóa phe đã chọn, khách mới vẫn có thể vào. Quà/tim trong lượt tính riêng. Mở mini game tạm dừng vòng cưới.

## Chạy và kiểm tra

Cần Windows, Node.js 20+, Python 3.10+. `npm ci` cài dependencies; lần đầu cần mạng để tải VieNeu. Giọng chạy ONNX trên CPU tại `tools/vieneu/`, không gọi dịch vụ giọng online. Trình duyệt có thể cần bấm bật tiếng một lần.

`npm test` chạy các bài kiểm tra hiện hành: điểm quà, hàng đợi, phiên thử/live, lưu cấu hình, MC, âm thanh, asset và mini game.

Ảnh dùng WebP; nhân vật dùng cả khung biểu cảm, không ghép đầu cắt rời. `python tools/audit_assets.py` kiểm tra asset không tham chiếu/thiếu. Các bài test/màn hình kiểm tra dành riêng cho bộ nhân vật cũ đã bỏ.

Dữ liệu chính: `settings.json`, `scripts.json`, `gift-events.json`, `wedding-cycle.json`, `rollcall.json`, `playlist.json`, `cache/session.json`. Không xóa các file này khi cập nhật.

Bản dự phòng trước đợt dọn control: `cache/backups/control-before-cleanup.zip`. Báo cáo dọn: `previews/studio-cleanup.json`; báo cáo thao tác DOM: `previews/studio-validation.json`. Khi đóng gói source, loại `node_modules/`, `cache/` và `previews/`; giữ model/venv giọng trên máy đang chạy.
