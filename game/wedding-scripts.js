'use strict';
// Kịch bản mặc định của vòng cưới. Mỗi lễ dùng cùng một số bản cho mọi cảnh, nên mỗi bản là một câu chuyện xuyên suốt:
// Bản 1: chiếc xe đạp tuột xích · Bản 2: bản hợp đồng hôn nhân · Bản 3: ba năm yêu xa.
// {re}, {dau}: tên hai vai · {le}: số thứ tự lễ · {topqua}: khách mừng nhiều nhất · {cuop}: khách vừa cướp vai.
// Câu có {topqua} hoặc {cuop} tự bỏ qua khi chưa có ai. Tên vai có thể là "Chú rể" nên không viết "chú rể {re}".
(function(root){
 const M=text=>({who:'mc',text}),R=text=>({who:'groom',text}),D=text=>({who:'bride',text}),A=action=>({action});
 const scripts=()=>({
  welcome:[
   [
    M('Cả nhà ơi, buông đũa xuống một chút nào! Rạp đã giăng, cỗ đã dọn, và lễ cưới thứ {le} của xóm mình sắp sửa bắt đầu.'),
    M('Hôm nay MC có một câu chuyện tình bắt đầu từ một chiếc xe đạp tuột xích. Nghe thì buồn cười, nhưng ai nghe xong cũng muốn đi cưới vợ.'),
    R('Dạ con chào hai họ. Thôi chú MC đừng kể chuyện chiếc xe đạp nữa, con ngại lắm.'),
    D('Sao lại không kể? Chính cái xe đó làm em mất cả thanh xuân đó anh.'),
    M('Đấy, mới đứng đón khách mà đã có chuyện để nghe rồi. Bà con chọn chỗ đi, gõ nhà trai hoặc nhà gái vào đây. Bên nào đông hơn, bên đó được ăn trước!'),
    A('wait')
   ],
   [
    M('Xin chào cả nhà! Lễ cưới thứ {le} sắp bắt đầu, và MC báo trước, lễ này không giống lễ nào hết.'),
    M('Vì đôi này không chỉ cưới nhau. Họ còn ký hẳn một bản hợp đồng hôn nhân, có điều khoản đàng hoàng, và cả rạp sẽ làm chứng.'),
    D('Con đã soạn xong rồi ạ. Tổng cộng chín trang, chưa tính phụ lục.'),
    R('Chín trang? Hôm qua em nói có ba trang mà em?'),
    M('Chú rể bắt đầu thấy lo rồi đó bà con. Ai đứng về phía chú rể thì gõ nhà trai, ai đứng về phía cô dâu thì gõ nhà gái. Trận này cần viện binh!'),
    A('wait')
   ],
   [
    M('Thưa cả nhà, có những đám cưới phải chờ một năm. Đám cưới hôm nay phải chờ tới ba năm, và cách nhau hơn một nghìn cây số.'),
    M('Ba năm đó là những cuộc gọi lúc nửa đêm, là những chuyến xe khách chạy suốt đêm. Hôm nay, lần đầu tiên, hai người không phải nói lời tạm biệt nữa.'),
    D('Con cảm ơn mọi người đã tới. Hôm nay con không phải canh giờ tàu xe nữa rồi.'),
    R('Dạ, cả nhà ngồi chơi với tụi con thật lâu nhé. Lâu lắm tụi con mới được đứng cạnh nhau như thế này.'),
    M('Lễ cưới thứ {le} sắp bắt đầu. Bà con đang xem từ đâu, gõ tên quê mình vào đây. Xem hôm nay ai đi xa nhất để chúc đôi trẻ nào.'),
    A('wait')
   ]
  ],
  entrance:[
   [
    M('Cả rạp nhìn về phía cổng hoa nào! Ba năm trước, cũng ở một con đường như thế này, có một cô gái dắt bộ chiếc xe đạp tuột xích.'),
    M('Và có một chàng trai dừng lại sửa giúp, dù chẳng biết sửa xe. Xin mời hai nhân vật chính của câu chuyện, {re} và {dau}!'),
    A('walk'),
    D('Anh còn nhớ không, sửa nửa tiếng, tay đen thui mà xích vẫn tuột.'),
    R('Anh nhớ chứ. Tại anh cố tình sửa chậm, để được đứng với em lâu hơn.'),
    M('Nghe chưa bà con! Ba năm mới chịu khai ra. Thanh niên trong rạp ghi lại đi, chiêu này có bảo hành đó.'),
    M('Vỗ tay thật lớn nào, để đôi trẻ biết cả xóm đang đứng về phía họ!')
   ],
   [
    M('Mời cả rạp đứng dậy! Các bên trong hợp đồng hôn nhân chuẩn bị tiến vào lễ đường.'),
    M('Bên A, {re}. Bên B, {dau}. Hai họ làm chứng, MC làm luật sư không công.'),
    A('walk'),
    R('Em ơi, ký xong rồi anh có được đọc lại không?'),
    D('Được chứ. Đọc sau khi đã ký.'),
    M('Mấy anh đã có vợ trong rạp vừa gật đầu rất là đau khổ. Đúng không ạ? Gõ một chữ đúng vào đây cho MC biết mình không cô đơn.'),
    M('Đôi trẻ sắp tới lễ đài rồi. Một tràng pháo tay cho sự dũng cảm của bên A nào!')
   ],
   [
    M('Xin mọi người yên lặng một chút. Quãng đường này chỉ vài chục bước, nhưng hai người đã phải đi mất ba năm.'),
    M('Xin mời {re} và {dau}.'),
    A('walk'),
    R('Trước đây muốn gặp em, anh phải đi mười bảy tiếng xe khách. Hôm nay chỉ còn mấy bước chân thôi.'),
    D('Anh đi chậm thôi. Quãng đường này em muốn nhớ thật kỹ.'),
    M('Có những người yêu nhau gần mà vẫn xa. Còn hai bạn này, xa như vậy mà chưa bao giờ buông tay.'),
    M('Xin cả rạp dành cho hai bạn một tràng pháo tay thật ấm.')
   ]
  ],
  ceremony:[
   [
    M('Kính thưa hai họ, giờ lành đã tới! Lễ thành hôn của {re} và {dau} xin được bắt đầu.'),
    M('Ba năm trước, một người đã dừng xe vì một sợi xích tuột. Hôm nay, người đó có một câu muốn hỏi. Mời chú rể.'),
    R('{dau} ơi, hôm đó anh không sửa được xe cho em. Nhưng từ hôm đó, chưa ngày nào anh không nghĩ tới em.'),
    R('Anh không hứa cuộc đời mình sẽ không có lúc tuột xích. Anh chỉ hứa, lúc nào tuột, anh cũng ở đó sửa cùng em.'),
    R('Vậy nên hôm nay, trước mặt hai họ, anh hỏi em. {dau}, em có đồng ý làm vợ anh không?'),
    M('Cả rạp nín thở đi nào. Ba năm mới có một câu này, không ai được gắp thức ăn lúc này hết.'),
    A('pause'),
    D('Anh hỏi gì mà lâu thế. Em đồng ý từ hôm anh làm dính dầu nhớt lên áo em rồi.'),
    D('Em đồng ý. Lúc vui em đi cùng anh, lúc tuột xích em cũng dắt bộ cùng anh. Còn anh, có hứa thương em cả khi em già và khó tính không?'),
    R('Anh hứa. Mà em khó tính sẵn rồi, nên anh quen từ lâu rồi.'),
    M('Khoan đã! Theo lệ xóm mình, MC phải hỏi một câu trước khi trao nhẫn. Trong rạp này, có ai phản đối đám cưới này không?'),
    M('Ai muốn cướp dâu, cướp rể thì đây là giây phút cuối cùng. Qua giây này là im lặng cả đời đó nha. MC đếm chậm thôi.'),
    A('wait'),
    M('Hai họ vừa thấy rồi đó, {cuop} đã ra tay giữa lễ. Yêu là phải liều như vậy. Nhưng lễ cưới thì vẫn phải tiếp tục!'),
    M('Mời đôi trẻ trao nhẫn. Vòng tròn này không có điểm đầu, cũng chẳng có điểm cuối, và tuyệt đối không tuột xích.'),
    A('rings'),
    M('Thay mặt hai họ, xin tuyên bố {re} và {dau} chính thức là vợ chồng! Chú rể ơi, ba năm chờ đợi là để cho giây phút này đây.'),
    A('kiss'),
    M('Vỗ tay đi cả nhà! Vỗ cho rạp rung lên nào! Gõ trăm năm hạnh phúc vào đây để chúc mừng đôi trẻ!'),
    A('applause')
   ],
   [
    M('Thưa hai họ, phiên ký kết hợp đồng hôn nhân giữa {re} và {dau} chính thức bắt đầu. Mời cả rạp giữ trật tự như đang ở tòa.'),
    M('Trước khi vào điều khoản, bên A có một đề nghị quan trọng. Mời chú rể trình bày.'),
    R('{dau} à, anh không giàu. Anh nói không hay. Tài sản lớn nhất của anh là biết nấu cơm và không biết cãi lại em.'),
    R('Với tài sản như vậy, anh xin hỏi một câu. Em có đồng ý lấy anh không?'),
    M('Một lời cầu hôn thành thật tới mức đau lòng. Bên B, mời trả lời.'),
    D('Xét thấy bên A có tiến bộ, biết rửa bát, và thương mẹ em. Em đồng ý.'),
    R('Trời ơi, em đồng ý thật hả? Hai họ nghe rõ rồi đó nha, không rút lại được đâu!'),
    M('Rồi, vào điều khoản. Điều một, lương về đâu?'),
    R('Dạ, lương về tay vợ. Đủ cả, không giữ lại đồng nào ạ.'),
    M('Điều hai, cãi nhau thì ai xin lỗi trước?'),
    D('Người nào sai thì xin lỗi trước. Và trong nhà này, anh là người sai.'),
    M('Điều ba, điều này MC tự thêm. Có giận thế nào cũng không được giận qua đêm. Hai bên đồng ý không?'),
    R('Anh đồng ý.'),
    D('Em đồng ý. Điều này em ký thật lòng.'),
    M('Hợp đồng còn một thủ tục cuối. Có ai trong rạp phản đối không? Ai muốn cướp dâu, cướp rể thì nhanh tay, ký xong là hết hiệu lực khiếu nại!'),
    A('wait'),
    M('Biên bản ghi nhận, {cuop} đã giành quyền ký thay ngay giữa phiên. Xóm mình chưa bao giờ thiếu người gan dạ!'),
    M('Mời hai bên trao nhẫn, thay cho chữ ký và con dấu.'),
    A('rings'),
    M('Hợp đồng có hiệu lực suốt đời, không gia hạn, không thanh lý. {re} và {dau} từ nay là vợ chồng! Mời đóng dấu.'),
    A('kiss'),
    M('Dấu đỏ chót luôn! Vỗ tay cho bên A và bên B nào! Ai đồng ý thì gõ đồng ý vào đây làm chứng!'),
    A('applause')
   ],
   [
    M('Kính thưa hai họ, xin cả rạp lắng lại trong giây lát. Lễ thành hôn của {re} và {dau} xin được bắt đầu.'),
    M('Ba năm, hơn một nghìn ngày, và không biết bao nhiêu chuyến xe đêm. Tất cả là để đi tới được đúng câu hỏi này.'),
    R('{dau} ơi, những đêm gọi điện cho em, anh nghe cả tiếng xe ngoài đường bên em mà không làm được gì.'),
    R('Có lần em ốm, anh đứng ở bến xe suốt đêm chờ chuyến sớm nhất. Lúc đó anh biết, cả đời này anh chỉ muốn đi về một hướng.'),
    R('Từ nay anh không muốn nói lời tạm biệt với em nữa. Em có đồng ý về chung một nhà với anh không?'),
    M('Cả rạp đang nghe em đó. Mười bảy tiếng xe khách đã dừng ở đây rồi.'),
    A('pause'),
    D('Anh biết không, mỗi lần tiễn anh ở bến xe, em đều quay lưng đi thật nhanh, vì không muốn anh thấy em khóc.'),
    D('Hôm nay em khóc cho anh thấy luôn. Em đồng ý. Em đồng ý cả hôm nay, và tất cả những ngày không còn phải tạm biệt.'),
    M('Thưa hai bạn, MC xin hỏi một câu thật lòng. Sau này gần nhau rồi, có những ngày sẽ giận nhau hơn cả lúc ở xa. Hai bạn có còn giữ tay nhau không?'),
    R('Dạ có. Ba năm xa còn giữ được, thì ở gần con không buông.'),
    D('Dạ, con cũng vậy.'),
    M('Nhưng tình yêu thì luôn có thử thách. MC xin hỏi lần cuối, trong rạp có ai muốn cướp dâu, cướp rể không? Đây là giây phút cuối cùng.'),
    A('wait'),
    M('Cả rạp vừa thấy, {cuop} đã bước lên giữa lễ. Câu chuyện hôm nay đúng là không ai đoán trước được.'),
    M('Xin mời đôi trẻ trao nhẫn. Từ nay khoảng cách giữa hai bạn chỉ còn bằng một vòng tay.'),
    A('rings'),
    M('Thay mặt hai họ, xin tuyên bố {re} và {dau} chính thức là vợ chồng. Chú rể ơi, lần này không có chuyến xe nào phải đuổi theo nữa.'),
    A('cheek'),
    M('Xin cả rạp vỗ tay thật lâu. Ai đang rưng rưng thì gõ một trái tim vào đây cho đôi trẻ nhé.'),
    A('applause')
   ]
  ],
  cake:[
   [
    M('Lời đã hứa, nhẫn đã trao. Giờ tới phần mà bàn cuối chờ từ nãy tới giờ. Mời đôi trẻ cắt bánh cưới!'),
    R('Em cầm dao đi, anh đặt tay lên. Lần này để anh sửa cùng em cho chắc.'),
    D('Anh mà làm tuột dao là em bắt đền cả ba năm đó nha.'),
    A('cake'),
    M('Một nhát dứt khoát, không tuột phát nào! Tiến bộ vượt bậc so với ba năm trước.'),
    M('Mời hai họ nâng ly! Ly này uống cho những lần hỏng xe trên đường. Không có chúng, hôm nay chúng ta đã chẳng ngồi đây.'),
    R('Con xin mời hai họ một ly. Cảm ơn cả nhà đã tới chung vui với tụi con.'),
    D('Con mời cả nhà. Ai còn xe đạp cũ thì đừng vội bán nha, biết đâu lại có duyên.'),
    M('Nghe cô dâu nói chưa! Nào, một, hai, ba, zô!'),
    A('toast'),
    M('Ly này cạn rồi, chuyện vẫn còn dài. Bà con ơi, ai từng gặp người thương trong hoàn cảnh trớ trêu thì kể MC nghe với.')
   ],
   [
    M('Theo phụ lục số một của hợp đồng, cắt bánh cưới là căn cứ xác định ai giữ quyền hành trong nhà. Mời hai bên vào vị trí.'),
    D('Dao đưa em. Anh chỉ cần đặt tay lên cho đẹp ảnh thôi.'),
    R('Dạ. Anh đã đọc tới trang này rồi, anh hiểu ạ.'),
    A('cake'),
    M('Biên bản ghi nhận, bên B cầm dao, bên A đứng cười. Tình hình nhà này từ nay đã rõ.'),
    M('Mời hai họ nâng ly để hợp thức hóa. Đại diện bên A phát biểu.'),
    R('Con xin mời nhà gái một ly. Từ nay con xin làm con trong nhà, rửa bát từ bữa đầu tiên.'),
    D('Con mời nhà trai một ly. Con hứa thương mẹ chồng như mẹ đẻ, và trả chồng về nguyên vẹn sau mỗi lần giận.'),
    A('toast'),
    M('Thế là hai họ đã thành một nhà. Bà con có ai muốn thêm điều khoản nào cho chú rể không? Gõ vào đây, MC đọc cho nghe.'),
    A('wait')
   ],
   [
    M('Có một điều rất lạ. Ba năm yêu xa, hai bạn này đã ăn với nhau không biết bao nhiêu bữa cơm qua màn hình điện thoại. Nhưng đây mới là chiếc bánh đầu tiên cùng cắt.'),
    R('Miếng đầu tiên này anh dành cho em. Lần này không phải nhìn em ăn qua điện thoại nữa.'),
    D('Còn miếng này em để phần anh. Không cần gói gửi xe nữa rồi.'),
    A('cake'),
    M('Mời hai họ cùng nâng ly. Ly này xin kính những người đang phải xa người mình thương, bất kể là bao xa.'),
    D('Ai đang yêu xa thì cố lên nha. Con đi qua rồi, con biết là đáng lắm.'),
    R('Con mời cả nhà. Cảm ơn mọi người đã ở đây cùng tụi con.'),
    A('toast'),
    M('Trong rạp mình có ai đang yêu xa không? Gõ khoảng cách của bạn vào đây. Biết đâu MC đọc được, người ấy cũng đang xem.'),
    A('wait')
   ]
  ],
  show:[
   [
    M('Cỗ đã vào, rượu đã ngà, tới lúc xóm mình trổ tài rồi! Đội văn nghệ ơi, chú rể sửa xe không giỏi, nhưng nhảy thì để xem. Mời lên sân khấu!'),
    R('Thôi thôi, em ơi, anh tuột xích ngay từ nhịp đầu đó.'),
    D('Không sao, em quen rồi. Anh cứ đứng đó vỗ tay đi.'),
    A('dance'),
    M('Đỉnh quá đội ơi! Cả rạp cho một tràng pháo tay nào! Ai thấy đã thì gõ một chữ đã vào đây!'),
    A('applause')
   ],
   [
    M('Theo điều khoản giải trí của hợp đồng, bên A và bên B có quyền được xem văn nghệ miễn phí. Xin mời đội văn nghệ xóm mình!'),
    D('Tí nữa anh lên nhảy cùng đội nha.'),
    R('Em ơi, trang nào ghi điều đó vậy?'),
    D('Trang mười. Anh chưa đọc tới đâu.'),
    A('dance'),
    M('Xuất sắc! Hợp đồng này đáng giá từng trang! Bà con chấm tiết mục bao nhiêu điểm trên mười, gõ vào đây nào!'),
    A('applause')
   ],
   [
    M('Suốt ba năm, mỗi lần gặp nhau hai bạn chỉ kịp ăn một bữa cơm rồi lại ra bến xe. Chưa bao giờ được ngồi xem hết một tiết mục với nhau. Hôm nay thì có.'),
    M('Đội văn nghệ ơi, cho đôi trẻ một bài thật dài, thật sôi động nào!'),
    A('dance'),
    D('Vui quá trời luôn. Lần đầu tiên con xem hết một bài mà không phải nhìn đồng hồ.'),
    M('Một tràng pháo tay cho đội văn nghệ! Bà con thích bài này thì gõ hay quá vào đây nhé!'),
    A('applause')
   ]
  ],
  thanks:[
   [
    M('Thưa cả nhà, câu chuyện bắt đầu từ một sợi xích tuột, đã tới đoạn đẹp nhất rồi.'),
    R('Dạ con cảm ơn hai họ. Cảm ơn cả chiếc xe đạp nữa, giờ nó vẫn nằm ở sau nhà con.'),
    D('Con cảm ơn mọi người đã tới. Con cũng cảm ơn anh đã sửa xe dở như vậy.'),
    M('Lễ hôm nay còn có màn kịch tính của {cuop}. Không có bạn, đám cưới đã thiếu mất một phần gia vị!'),
    M('Và trong sổ vàng lễ này, xin được xướng tên {topqua}. Hai họ ghi nhớ tấm lòng của các bạn.'),
    M('Chúc {re} và {dau} đi đường dài mà xích không bao giờ tuột. Pháo hoa đâu, bắn lên nào!'),
    A('sparkle'),
    M('Khoan đã về nha bà con! Lễ sau có câu chuyện hoàn toàn khác. Và nhân vật chính, biết đâu lại là bạn đó.')
   ],
   [
    M('Thưa các bên, hợp đồng đã ký, nhẫn đã trao, cỗ đã gần hết. MC xin đọc biên bản kết thúc phiên.'),
    D('Con cảm ơn mọi người đã làm chứng. Sau này anh ấy có quên điều nào, cả nhà nhắc giúp con nhé.'),
    R('Tụi con hẹn gặp lại cả nhà ở đám đầy tháng ạ.'),
    M('Mới cưới xong đã hẹn đầy tháng! Điều khoản này bên B đã biết chưa vậy?'),
    D('Dạ, chưa ạ. Về nhà tụi con họp.'),
    M('Biên bản ghi rõ, {cuop} đã có màn đòi quyền lợi rất ấn tượng. Xóm mình xin ghi nhận.'),
    M('Người làm chứng hào phóng nhất lễ này là {topqua}. Hai họ xin cảm ơn.'),
    A('sparkle'),
    M('Phiên kết thúc! Còn ai muốn tự ký một bản hợp đồng cho riêng mình, nhìn bảng bên phải màn hình, lễ sau là tới lượt bạn đó.')
   ],
   [
    M('Thưa cả nhà, có những lời tạm biệt làm người ta buồn. Nhưng lời tạm biệt hôm nay thì khác, vì lần này hai bạn ra về cùng một hướng.'),
    R('Tụi con cảm ơn cả nhà. Từ hôm nay, tụi con không cần mua vé xe nữa.'),
    D('Con cảm ơn mọi người đã nghe chuyện của tụi con. Mong ai đang chờ đợi cũng tới được ngày này.'),
    M('Trong câu chuyện hôm nay, {cuop} đã bất ngờ xuất hiện như một khúc quanh. Cảm ơn bạn đã làm lễ cưới này khó quên.'),
    M('Xin trân trọng cảm ơn {topqua}, những người đã góp nhiều chỉ vàng nhất cho đôi trẻ hôm nay.'),
    A('sparkle'),
    M('Đôi trẻ về nhà rồi, nhưng rạp xóm mình vẫn sáng đèn. Bà con ngồi lại nhé, câu chuyện tiếp theo sắp bắt đầu.')
   ]
  ]
 });
 const extraLines=()=>({
  sceneNext:[
   'Khoan đã nha cả nhà, phần hay nhất còn ở phía trước. Sắp tới là {tieptheo}.',
   'Tranh thủ uống miếng nước đi bà con, chút nữa {tieptheo} là không rời mắt được đâu.',
   'Ai vừa vào xem thì tới đúng lúc rồi đó. Ngay sau đây là {tieptheo}.',
   'Gọi thêm bạn bè vào đi, kẻo lỡ {tieptheo} lại trách MC không báo trước.',
   'Đừng đi đâu nha, {tieptheo} sắp bắt đầu rồi, và MC đã xem trước, hay lắm.',
   'Đôi trẻ đang chỉnh lại áo quần. Còn bà con chuẩn bị tinh thần cho {tieptheo} đi là vừa.'
  ].join('\n'),
  miniNext:[
   'Bên thắng đừng vội mừng, bên thua đừng vội buồn. Còn {tieptheo} để phân định đây!',
   'Mới có hiệp một thôi nha! Hai họ lấy hơi đi, sắp tới {tieptheo}.',
   'Nhà thua vừa xin tái đấu kìa! Được thôi, gặp nhau ở {tieptheo}.'
  ].join('\n'),
  miniDone:[
   'Thắng thua cũng là người một nhà. Giờ xin mời hai họ nghe đôi trẻ nói lời cuối.',
   'Chơi hết mình rồi, giờ tới phút lắng lại. Xin mời đôi cưới ra chào hai họ.',
   'Mồ hôi đã đổ, tiếng cười đã đủ. Câu chuyện hôm nay xin đi tới đoạn kết.'
  ].join('\n')
 });
 const stories=()=>['Chiếc xe đạp tuột xích','Bản hợp đồng hôn nhân','Ba năm yêu xa'];
 const api={scripts,extraLines,stories};
 if(typeof module!=='undefined')module.exports=api;else root.WeddingScripts=api;
})(typeof globalThis!=='undefined'?globalThis:this);
