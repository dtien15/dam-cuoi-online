'use strict';
(function(root){
 const copy=x=>JSON.parse(JSON.stringify(x)),equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 class SettingsStore{
  constructor({defaults,validate,send,command,onChange=()=>{},onReplace=()=>{}}){Object.assign(this,{validate,send,command,onChange,onReplace});this.draft=copy(defaults);this.saved=null;this.remote=null;this.pending=null;this.error='';}
  get dirty(){return !!this.saved&&!equal(this.draft,this.saved);}
  get state(){return this.error?'error':this.remote?'conflict':this.pending?'saving':this.dirty?'dirty':this.saved?'saved':'loading';}
  changed(){this.error='';this.onChange(this);}
  receive(config){
   const next=this.validate(config);
   if(this.pending&&next.revision===this.pending.revision+1){
    const expected={...this.pending.value,revision:next.revision};
    if(!equal(next,expected)){this.error='Máy chủ trả nội dung khác. Bản nháp được giữ.';this.pending=null;this.onChange(this);return;}
    const edited=!equal(this.draft,this.pending.draft);this.saved=copy(next);this.pending=null;this.remote=null;this.error='';
    if(edited){this.draft.revision=next.revision;this.onChange(this);}else{this.draft=copy(next);this.onReplace(this);this.onChange(this);}return;
   }
   if(this.dirty){if(this.saved&&next.revision===this.saved.revision&&equal(next,this.saved))return;this.remote=copy(next);this.onChange(this);return;}
   this.saved=copy(next);this.draft=copy(next);this.remote=null;this.pending=null;this.error='';this.onReplace(this);this.onChange(this);
  }
  save(){if(this.pending||!this.dirty)return false;if(this.remote){this.error='Có bản mới. Bấm Bỏ để nạp lại trước khi lưu.';this.onChange(this);return false;}
   try{const value=this.validate(this.draft);this.pending={value:copy(value),draft:copy(this.draft),revision:value.revision};if(!this.send({type:this.command,config:value})){this.pending=null;return false;}this.error='';this.onChange(this);return true;}catch(e){this.error=e.message;this.onChange(this);return false;}}
  fail(message){if(!this.pending)return;this.pending=null;this.error=message;this.onChange(this);}
  discard(){if(!this.saved)return;this.saved=copy(this.remote||this.saved);this.draft=copy(this.saved);this.pending=null;this.remote=null;this.error='';this.onReplace(this);this.onChange(this);}
 }
 if(typeof module!=='undefined')module.exports=SettingsStore;else root.SettingsStore=SettingsStore;
})(typeof globalThis==='undefined'?this:globalThis);
