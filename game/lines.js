'use strict';
const SPEAKERS={mc:{name:'MC'},groom:{name:'Chú rể'},bride:{name:'Cô dâu'}};
const LINES={testVoice:['Xin chào bà con. Mời cả nhà vào tiệc nhé!']};
const CMT_RULES = [
  ['tho', /đọc thơ|doc tho|làm thơ|lam tho|thơ hài|tho hai/],
  ['chucmung', /ch[uú]c m[uừ]ng|happy wedding|tr[aă]m n[aă]m|h[aạ]nh ph[uú]c|congrat/],
  ['ny', /khi n[aà]o c[uư][oớ]i|ng[uư][oờ]i y[eê]u|\bny\b|ế qu[aá]|ế v[aậ]y|v[aẫ]n ế|độc thân|doc than/],
  ['an', /đói|\bdoi\b|ăn g[iì]|ăn cỗ|an co\b|bao giờ ăn|g[aà] lu[oộ]c|x[oô]i|\bnem\b/],
  ['bia', /\bbia\b|r[uư][oợ]u|nh[aậ]u|\bdô\b|c[aạ]n ly|100%/],
  ['dep', /c[oô] d[aâ]u (đ|d)[eẹ]p|ch[uú] r[eể] (đ|d)[eẹ]p|xinh|(đ|d)[eẹ]p tr[aa]i|đẹp qu[aá]|dep qua/],
  ['hat', /h[aá]t đi|h[aá]t b[aà]i|cho ch[uú] h[aá]t|nh[aạ]c|karaoke/],
  ['tien', /h[eế]t ti[eề]n|ngh[eè]o|cu[oố]i th[aá]ng|kh[oô]ng c[oó] ti[eề]n|ch[uư]a c[oó] l[uư][oơ]ng/],
  ['que', /[oở] đ[aâ]u|\bo dau\b|qu[eê] g[iì]|qu[eê] [oở]|[oở] t[iỉ]nh|from (vn|viet)/],
  ['nhat', /nh[aạ]t|ch[aá]n|t[eẻ] nh[aạ]t/],
  ['mc', /\bmc\b/],
  ['cuoi', /haha|hihi|kk+|=\)\)|:\)\)|😂|🤣|c[uư][oờ]i/],
  ['chao', /^(xin )?ch[aà]o|^hello|^hi\b|^alo|^h[eé]* ?l[oô]/],
  ['hoi', /\?$/],
];
/* Không đọc to những bình luận có các từ này (lọc thô, có thể thêm) */
const BAD_WORDS = /đm|\bdm\b|đ[iị]t|\bdit\b|l[oồ]n|bu[oồ]i|c[aặ]c|\bcc\b|vcl|\bvl\b|đ[eé]o|\bdeo\b|clm|\bmẹ m[aà]y|\bngu\b|s[uú]c v[aậ]t|ch[oó] m[aá]|http|www\.|\.com|\d{6,}/i;
