'use strict';
// Câu thoại mặc định khi MC trò chuyện với khách. Có thể sửa trong Kịch bản chung.
// Nguyên tắc: gọi tên khách, nói ngắn, có một cú bất ngờ, và thường kết bằng một câu khiến khách muốn gõ trả lời.
(function(root){
 const lines={
  wish:[
   '{ten} chúc hay quá! Câu này chú rể nên in ra dán đầu giường.',
   'Dừng lại đã cả nhà, {ten} vừa có một lời chúc rất đáng nghe.',
   '{ten} chúc xong, cô dâu cười tới mức rớt cả hoa cầm tay.',
   'Lời chúc của {ten} xin ghi vào sổ vàng, trang đầu tiên.',
   'Nghe {ten} chúc mà MC muốn đi cưới ngay, tiếc là chưa có ai nhận.',
   'Hai họ nghe rõ chưa? {ten} chúc thế này thì đôi trẻ hết đường cãi nhau.',
   '{ten} ơi, sau này đôi trẻ có em bé, chắc phải mời bạn đặt tên.',
   'Cảm ơn {ten}! Chúc ngọt thế này, bánh cưới hôm nay coi như thừa đường.',
   '{ten} vừa chúc, chú rể đã cúi đầu cảm ơn tới lần thứ ba rồi.',
   'Có lời chúc của {ten}, MC dám bảo hành đám cưới này một trăm năm.',
   'Câu này của {ten} đáng được in lên thiệp cưới lần sau.',
   'MC đọc to cho bàn cuối nghe luôn: {ten} vừa chúc đôi trẻ đó!',
   '{ten} chúc tới đâu, cả rạp vui tới đó. Ai chúc hay hơn không nào?',
   'Lời chúc này mà đem đi thi, {ten} chắc chắn có giải.'
  ],
  idle:[
   'Câu hỏi khó nhất hôm nay: nhà trai hay nhà gái đang đông hơn? Khách mới gõ nhà trai hoặc nhà gái để MC đếm xem nào.',
   'Ai muốn đổi diện mạo thì nhắn đổi nam hoặc đổi nữ. MC đổi được quần áo, còn độ đẹp trai thì xóm mình chịu.',
   'Hôm nay bạn muốn làm cô áo dài xanh hay thiếu nữ? Gõ đổi thành cô áo dài xanh, hoặc đổi thành thiếu nữ, lên đồ liền.',
   'Bụng đói thì gõ cho em gà, hoặc cho em xôi. Bồi bàn nhà mình chạy nhanh lắm, chỉ hay nhầm bàn thôi.',
   '{ten} ơi, MC để ý bạn nãy giờ. Bạn đang xem từ đâu vậy, kể cho cả rạp nghe với.',
   'MC có một câu đố. Đám cưới sợ nhất điều gì? Trời mưa, hết bia, hay chú rể quên lời thề? Gõ đáp án vào đây.',
   'Ai ở đây đã có gia đình rồi, cho đôi trẻ xin đúng một lời khuyên thôi. Thật lòng nhé, MC đọc to đó.',
   'Thử xem nào, ai đang độc thân gõ một chữ ế vào đây. MC không mai mối, MC chỉ thống kê thôi.',
   'Kể MC nghe đi, đám cưới quê bạn có món gì không ăn là coi như chưa đi cưới?',
   '{ten} ơi, nếu được nói một câu với cô dâu chú rể bây giờ, bạn sẽ nói gì?',
   'Cưới xong ai giữ điều khiển ti vi? Cả rạp bỏ phiếu giúp đôi trẻ đi, chuyện này ảnh hưởng tới cả đời đó.',
   'Bàn nào đang ồn nhất rạp vậy? Gõ tên quê mình vào đây xem quê nào nói nhiều nhất.',
   'Muốn nghe thơ thì nhắn MC đọc thơ. Báo trước, thơ MC có vần, còn có hay hay không thì tùy lòng tốt của bạn.',
   'Có ai từng đi ăn cưới mà nhầm đám không? Gõ có vào đây. MC từng nhầm hai lần, lần nào cũng ở lại ăn hết.',
   'Hồi xưa đi cưới phải đạp xe qua ba xã. Giờ nằm nhà cũng dự được, chỉ thiếu mỗi đĩa gà. Bạn chọn cách nào?',
   '{ten} ơi, hôm nay đi một mình hay rủ cả hội tới vậy? Rủ thêm đi, rạp còn nhiều ghế lắm.',
   'Người ngồi gần bếp là người có kinh nghiệm nhất. Trong rạp mình ai gần bếp thì lên tiếng, MC muốn học hỏi.',
   'Thật lòng nha, ai từng thích một người mà chưa dám nói? Gõ một dấu chấm thôi, MC không hỏi tên đâu.'
  ],
  welcome:[
   '{ten} tới rồi! Nhanh chân lên, chọn nhà trai hay nhà gái để MC còn xếp chỗ.',
   'Cả rạp chào {ten} nào! Bạn đang xem từ đâu tới vậy?',
   'A, {ten} tới đúng lúc lắm, mâm này đang thiếu một người biết kể chuyện.',
   '{ten} vào đi bạn ơi, đừng đứng ngoài cổng nhìn đĩa gà tội nghiệp thế.',
   'MC thấy {ten} rồi nha! Bạn là họ hàng bên nào, khai thật đi.',
   'Chào {ten}! Tới đây là có duyên rồi, hôm nay đi cưới hay đi tìm người để cưới?',
   '{ten} vừa bước vào, rạp sáng hẳn lên. Hoặc tại đèn mới sửa, MC cũng chưa rõ.',
   '{ten} ơi, lần đầu dự đám cưới xóm mình à? Ngồi đi, xem xong khó về lắm đó.',
   'Có khách quý tới! Mời {ten} vào bàn, cỗ vẫn còn nóng.',
   '{ten} tới muộn một chút mà vẫn kịp đoạn hay nhất nha.',
   'Chào {ten}! Hôm nay bạn ăn gì chưa, hay để bụng tới đây?'
  ],
  share:[
   '{ten} vừa đi mời cả xóm tới rồi kìa! Cảm ơn bạn, MC kê thêm bàn đây.',
   'Cảm ơn {ten}! Tin vui mà giữ một mình là có tội, bạn làm đúng lắm.',
   'Có {ten} đi loa khắp làng, nhà trai nhà gái khỏi cần in thiệp.',
   '{ten} vừa chia sẻ. Ai được mời tới thì nhớ chào {ten} một tiếng nha.',
   'Nhờ {ten} mà làng trên xóm dưới đều biết hôm nay có cưới.',
   '{ten} chia sẻ rồi. Sắp tới rạp đông là nhờ bạn, hết ghế cũng tại bạn.',
   'Bạn bè của {ten} ơi, vào nhanh đi, chỗ tốt sắp hết rồi đó!'
  ],
  like:[
   '{ten} thả tim dữ quá, rạp sắp thành vườn hoa rồi!',
   'Tim của {ten} bay kín lễ đài, chú rể phải né mới đi được.',
   '{ten} ơi, tay có mỏi không? Thôi cứ tiếp đi, MC đang đếm.',
   'Cả rạp nhìn kìa, {ten} đang một mình cân cả nhà trai.',
   'Cảm ơn {ten}! Có bạn mà không khí nóng hẳn lên, khỏi cần bật quạt.',
   'Nhờ {ten} mà cô dâu cười từ nãy tới giờ chưa khép miệng.',
   '{ten} thả tim nhanh hơn MC nói luôn. MC xin chịu thua.'
  ],
  'reply.tho':[
   'Thơ tới đây! Trầu xanh têm với cau vàng. Cô dâu cười tít, cả làng cùng vui. Chú rể đứng cạnh bùi ngùi. Từ nay rửa bát có người kiểm tra!',
   'Nghe nha! Hôm nay hai họ một nhà. Chú rể nhận việc giặt là từ đây. Cô dâu chỉ nhẹ bàn tay. Việc nhà anh gánh, cả ngày anh lo!',
   'Yêu nhau mấy núi cũng trèo. Cưới xong mới biết tiền theo vợ về. Ví anh còn lại tấm thẻ. Thẻ xe buýt đó, đừng chê anh nghèo!',
   'Đi đâu cũng nhớ về nhà. Lương về đưa vợ mới là chồng ngoan. Vợ cười là cả xóm làng. Vợ mà im lặng, anh toang tức thì!',
   'Ăn cỗ phải biết chờ nhau. Đùi gà để lại cho bàn đầu tiên. Bàn sau chớ có than phiền. Ai nhanh tay nấy, thần tiên cũng đành!'
  ],
  'reply.ny':[
   '{ten} hỏi chuyện người yêu hả? Nhìn quanh rạp đi, đám cưới là chỗ dễ gặp người thương nhất đó.',
   'MC chỉ giỏi nối bàn thôi {ten} ơi, nối duyên thì đang học. Nhưng bạn thích kiểu người thế nào, kể đi.',
   '{ten} đừng lo. Duyên tới là tới, trước mắt cứ ăn cho no đã, đói thì trông ai cũng đẹp.',
   'Ế không phải tội {ten} à. Ế lâu mà vẫn đi ăn cưới đều, đó mới là bản lĩnh.',
   'Cả rạp có ai đang độc thân giống {ten} không? Gõ đi, MC không hứa gì, nhưng biết đâu đó.'
  ],
  'reply.an':[
   '{ten} đói rồi hả? Gõ cho em gà hoặc cho em xôi, bồi bàn phi tới liền.',
   'Bình tĩnh {ten} ơi, cô dâu chưa tung hoa mà bạn đã hỏi xin hộp mang về rồi.',
   'Món ngon nhất đám cưới là món gắp được trước người khác đó {ten}.',
   'Câu hỏi của {ten} rất đúng trọng tâm. Đi cưới mà không hỏi món là đi sai mục đích.',
   'MC vừa ngó bếp giúp {ten} rồi. Gà còn, xôi còn, chỉ sợ bàn bên nhanh tay hơn thôi.'
  ],
  'reply.bia':[
   '{ten} định cụng ly với bàn nào đây? Nhớ là uống xong không lái xe nha.',
   'Trăm phần trăm hả {ten}? Từ từ, tí nữa còn phải đứng dậy chúc đôi trẻ nữa đó.',
   'MC cạn ly nước lọc với {ten}, để còn tỉnh táo dẫn tới cuối lễ.',
   'Uống vừa thôi {ten} ơi, không lại về nhầm nhà trai thành nhà gái bây giờ.'
  ],
  'reply.dep':[
   '{ten} khen cái là chú rể chỉnh ngay cà vạt, tưởng khen mình.',
   'Nghe {ten} khen, đôi trẻ đứng thẳng hẳn lên luôn.',
   '{ten} tinh mắt thật. Nhưng khen cô dâu đẹp là đúng, khen chú rể thì phải suy nghĩ lại.',
   'Một lời khen của {ten} thôi mà cô dâu nhớ cả đời đó.',
   'MC đồng ý với {ten}. Hôm nay đẹp nhất là cô dâu, nhì là đĩa gà.'
  ],
  'reply.hat':[
   '{ten} thích nhạc gì? Gõ tên bài đi, đội văn nghệ xóm mình không biết bài nào thì hát đại.',
   'Từ từ {ten} ơi, phần văn nghệ sắp tới rồi. Đội xóm mình đang khởi động, chú đội trưởng đang tìm dép.',
   'Bàn của {ten} thích vui nhộn hay nhẹ nhàng? Ý kiến đa số thì MC chiều.',
   '{ten} muốn nghe hát hả? MC hát cũng được, nhưng rạp có thể vắng đi một nửa.'
  ],
  'reply.tien':[
   '{ten} cứ ngồi đây vui đi, đám cưới xóm mình không tính tiền ghế.',
   'Cuối tháng ai chẳng vậy {ten} ơi. Một lời chúc thật lòng là đủ quý rồi.',
   'Chú rể cũng hết tiền từ hôm qua, {ten} không cô đơn đâu.',
   '{ten} yên tâm, hôm nay cười là miễn phí. Mời ở lại với hai họ.'
  ],
  'reply.que':[
   '{ten} hỏi quê MC hả? Chỗ nào có cỗ cưới là quê MC.',
   'MC ở ngay xóm này thôi. Còn {ten} ở đâu, đặc sản chỗ bạn là gì?',
   'Xóm mình nhỏ mà vui lắm {ten} ơi. Ai tới một lần là lần sau tự dẫn cả họ tới.',
   '{ten} đoán xem MC quê đâu. Đoán đúng MC đọc tặng một bài thơ.'
  ],
  'reply.nhat':[
   'MC nhận lỗi với {ten}. Bạn muốn gì đây: nghe thơ, nghe chuyện hay tự lên làm chú rể?',
   '{ten} chán hả? Lên làm cô dâu chú rể đi, đảm bảo hết chán, mà có khi còn sợ.',
   'Góp ý thật lòng thế này MC quý lắm. {ten} muốn MC đổi trò gì, nói một câu là đổi.',
   'Khoan chán đã {ten} ơi, sắp tới màn cướp dâu rồi. Xem xong mà vẫn chán thì MC xin nghỉ việc.',
   'Ai cũng có quyền chán, nhưng {ten} là người đầu tiên dám nói. MC ghi nhận, và xin kể ngay một chuyện vui.'
  ],
  'reply.mc':[
   'MC đây {ten}! Vừa dẫn lễ vừa canh đĩa gà nên trả lời hơi chậm. Bạn cần gì nào?',
   'Có mặt! {ten} gọi là MC tới. Trừ lúc chú rể đang đọc lời thề.',
   '{ten} gọi MC có việc gì không, hay chỉ nhớ giọng MC thôi?',
   'Dạ MC nghe. {ten} nói nhanh kẻo lỡ giờ lành nha.',
   'Gọi MC là phải có chuyện hay đó {ten}. Kể đi, cả rạp đang nghe.'
  ],
  'reply.cuoi':[
   '{ten} cười là MC có động lực dẫn thêm ba tiếng nữa.',
   'Cười vừa thôi {ten}, chú rể tưởng mình kể chuyện hay thật bây giờ.',
   'Tiếng cười của {ten} nghe rõ hơn cả loa kéo.',
   '{ten} cười gì đó, kể cả rạp nghe với, đừng cười một mình.',
   'Cười nhiều vào {ten}, đi cưới mà nghiêm mặt là dễ bị bắt làm chú rể lắm.'
  ],
  'reply.chao':[
   'Chào {ten}! Bạn tới vừa đúng lúc, đoạn hay sắp bắt đầu rồi.',
   'A {ten}! Nhà trai hay nhà gái đây, khai mau.',
   'MC chào {ten}! Hôm nay trông bạn có vẻ rất muốn được ăn cỗ.',
   '{ten} chào to thế, cả rạp quay lại nhìn rồi kìa. Ngồi đi bạn ơi.',
   'Chào {ten} nha! Xem từ đâu vậy, ở đó trời có đẹp bằng đám cưới này không?'
  ],
  'reply.hoi':[
   'Câu của {ten} khó đấy. Để MC hỏi lại cô bàn đầu, cô biết hết mọi chuyện trong xóm.',
   '{ten} hỏi hay quá, MC chưa kịp hiểu. Nói thêm một câu nữa đi bạn.',
   'Cả rạp ơi, ai trả lời giúp {ten} được thì gõ vào đây, MC đang bí.',
   'MC mà trả lời được câu của {ten} thì đã không phải đi dẫn đám cưới rồi.'
  ],
  'reply.team':[
   '{ben} có thêm {ten}, cả bàn vừa đứng dậy vỗ tay kìa!',
   'Rõ! {ten} về {ben}. Qua bàn nhớ kể chuyện vui, đừng chỉ canh đĩa gà.',
   'Hoan nghênh {ten} về {ben}, đội hình mạnh lên trông thấy.',
   '{ten} chọn {ben} rồi. Bên kia hơi tiếc rồi đó nha.'
  ],
  'reply.kitchen':[
   '{ten} chọn gần bếp là biết nghĩ cho cái bụng. Món tiếp theo là gì, báo MC với.',
   'Ngồi gần bếp là người từng trải đó. {ten} chắc đi ăn cưới nhiều lắm rồi.'
  ],
  'reply.dishes':[
   '{ten} tình nguyện rửa bát hả? Hai họ xin ghi công, chú rể xin học hỏi.',
   'Rửa bát chia đôi, hạnh phúc nhân đôi. MC đứng xa cổ vũ {ten} nha.'
  ],
  'reply.food':[
   '{ten} chọn món này là có gu đó. Cô dâu cũng thích y vậy.',
   'MC ghi món của {ten} rồi. Ai đi cưới cũng có một món ruột, đúng không?',
   'Chuẩn! {ten} ăn đi, để bàn bên nhìn mà thèm.'
  ],
  'reply.location':[
   'Khách từ {binhluan} tới! Xa thế mà {ten} vẫn đi cưới, xin một tràng pháo tay.',
   '{binhluan} hả? Đặc sản ở đó là gì vậy {ten}, mai MC ghé.',
   'Hai họ ơi, {binhluan} đã có mặt! Còn nơi nào xa hơn không nào?'
  ],
  'reply.fallback':[
   '{ten} vừa nói {binhluan}. Bàn bên có ai ý kiến gì không?',
   'Ủa {binhluan} là sao {ten}? Kể tiếp đi, MC tò mò rồi đó.',
   'Khoan, {ten} nói {binhluan}. Câu này MC phải suy nghĩ thêm.',
   'MC nghe {ten} rồi nha. Rồi sao nữa, kể tiếp đi bạn.',
   '{ten} ơi, bạn muốn gọi món, đổi nhân vật hay gửi lời chúc vậy?'
  ]
 };
 const api={lines};
 if(typeof module!=='undefined')module.exports=api;else root.MCLines=api;
})(typeof globalThis!=='undefined'?globalThis:this);
