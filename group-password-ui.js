(function(){'use strict';
function $(id){return document.getElementById(id)}
function field(p,id,label,type,ph){const w=document.createElement('div');w.style.marginTop='8px';w.innerHTML='<label>'+label+'</label><input type="'+type+'" id="'+id+'" placeholder="'+ph+'">';p.appendChild(w)}
function setup(){
 const j=$('join-accordion-body');
 if(j&&!$('join-group-name')){
  const old=$('join-group-code');
  if(old)old.parentElement?.remove();
  const btn=j.querySelector('.btn-submit');
  const n=document.createElement('div');
  n.innerHTML='<label>GROUP NAME</label><input type="text" id="join-group-name" placeholder="e.g. Friday Drinks">';
  j.insertBefore(n,btn);
  field(j,'join-group-code','5-CHARACTER GROUP CODE','text','e.g. K7M2P');
  const h=document.createElement('p');
  h.style.cssText='font-size:11px;color:var(--text-muted);margin:8px 0';
  h.textContent='Enter the exact group name and the unique 5-character code shared by the host.';
  j.insertBefore(h,btn);
 }
 const c=$('create-accordion-body');
 if(c&&!$('create-group-generated-note')){
  const code=$('create-group-code');
  if(code){code.value='';code.type='hidden';code.removeAttribute('disabled')}
  const lab=Array.from(c.querySelectorAll('label')).find(x=>x.textContent.includes('UNIQUE CODE'));
  if(lab)lab.remove();
  const note=document.createElement('p');
  note.id='create-group-generated-note';
  note.style.cssText='font-size:11px;color:var(--text-muted);margin:8px 0';
  note.textContent='Your unique 5-character group code will be generated automatically when you create the group.';
  const btn=c.querySelector('.btn-submit');
  if(btn)c.insertBefore(note,btn);
 }
}
async function create(){
 const n=$('create-group-name')?.value.trim();
 if(!n)return alert('Enter a group name.');
 const r=await sb.rpc('create_group_secure',{p_name:n});
 if(r.error)return alert(r.error.message||'Unable to create group.');
 const code=r.data?.password;
 if(!code)return alert('Group created, but the code could not be displayed. Please contact the host/admin.');
 alert('Group created!\n\nYour unique group code is: '+code+'\n\nShare this 5-character code with the people you want to join.');
 $('create-group-name').value='';
 if(typeof closeAllExpandables==='function')closeAllExpandables();
 await fetchUserGroups();
}
async function join(){
 const n=$('join-group-name')?.value.trim();
 const p=$('join-group-code')?.value.trim().toUpperCase();
 if(!n||!p)return alert('Enter both the group name and 5-character group code.');
 if(!/^[A-Z0-9]{5}$/.test(p))return alert('The group code must be exactly 5 letters/numbers.');
 const r=await sb.rpc('join_group_secure',{p_group_name:n,p_password:p});
 if(r.error)return alert(r.error.message||'Group name and code do not match.');
 $('join-group-name').value='';
 $('join-group-code').value='';
 if(typeof closeAllExpandables==='function')closeAllExpandables();
 await fetchUserGroups();
}
async function setPassword(code){
 const r=await sb.rpc('set_group_password',{p_group_code:code});
 if(r.error)return alert(r.error.message||'Unable to generate a new group code.');
 const generated=r.data?.password;
 if(generated)alert('New group code generated:\n\n'+generated+'\n\nThe previous code no longer works.');
 else alert('Group code updated.');
}
function install(){
 setup();
 window.createGroup=create;
 window.joinGroup=join;
 if(typeof window.renderInlineHostPanel==='function'){
  const original=window.renderInlineHostPanel;
  window.renderInlineHostPanel=async function(code){
   await original(code);
   const panel=$('host-panel-'+code);
   if(!panel||panel.querySelector('[data-set-group-password]'))return;
   const b=document.createElement('button');
   b.className='btn-secondary';
   b.style.cssText='width:100%;margin-top:8px;padding:7px;font-size:11px';
   b.textContent='Generate New Group Code';
   b.setAttribute('data-set-group-password','1');
   b.onclick=function(e){e.stopPropagation();setPassword(code)};
   panel.appendChild(b);
  }
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install()})();
