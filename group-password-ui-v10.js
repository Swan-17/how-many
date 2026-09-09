(function(){
'use strict';

const URL='https://tmwmsmkivxyenulifmdk.supabase.co';
const KEY='sb_publishable_Up-QZhkzCGzgO59fyF-zag_K7PSpYmU';
let db=null;
try{ if(window.supabase?.createClient) db=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); }catch(e){console.error('Group UI Supabase init failed',e)}
const $=id=>document.getElementById(id);
const joinBody=()=>$('join-accordion-body');
const createBody=()=>$('create-accordion-body');

function buildJoin(){
 const body=joinBody(); if(!body)return;
 body.querySelectorAll('*').forEach(el=>{ if(el.id==='join-group-name'||el.id==='join-group-code'||el.dataset.groupJoinButton==='1') return; });
 const old=body.querySelector('#join-group-code');
 const name=body.querySelector('#join-group-name');
 const btn=body.querySelector('[data-group-join-button="1"]');
 if(name&&old&&btn)return;
 body.innerHTML='';
 const a=document.createElement('div'); a.innerHTML='<label>GROUP NAME</label><input id="join-group-name" type="text" placeholder="e.g. Friday Drinks" autocomplete="off">';
 const b=document.createElement('div'); b.style.marginTop='8px'; b.innerHTML='<label>5-CHARACTER GROUP CODE</label><input id="join-group-code" type="text" maxlength="5" placeholder="e.g. K7M2P" autocomplete="off" autocapitalize="characters" spellcheck="false" style="text-transform:uppercase">';
 const note=document.createElement('p'); note.style.cssText='font-size:11px;color:var(--text-muted);margin:8px 0'; note.textContent='Enter the exact group name and the permanent 5-character code shared by the host.';
 const button=document.createElement('button'); button.className='btn-submit'; button.type='button'; button.dataset.groupJoinButton='1'; button.textContent='Join Group';
 body.append(a,b,note,button);
 button.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();join();},true);
}

function buildCreate(){
 const body=createBody(); if(!body)return;
 const name=$('create-group-name');
 if(!name)return;
 const current=body.querySelector('[data-group-create-button="1"]');
 if(current)return;
 const value=name.value;
 body.innerHTML='';
 const a=document.createElement('div'); a.innerHTML='<label>GROUP NAME</label><input id="create-group-name" type="text" placeholder="e.g. Friday Drinks" autocomplete="off">';
 a.querySelector('input').value=value;
 const note=document.createElement('p'); note.style.cssText='font-size:11px;color:var(--text-muted);margin:8px 0'; note.textContent='A unique 5-character group code will be generated automatically and permanently locked when the group is created.';
 const button=document.createElement('button'); button.className='btn-submit'; button.type='button'; button.dataset.groupCreateButton='1'; button.textContent='Create & Become Host';
 body.append(a,note,button);
 button.addEventListener('click',function(e){e.preventDefault();e.stopImmediatePropagation();create();},true);
}

async function requireSession(){
 if(!db)throw new Error('Unable to connect to the group service.');
 const s=await db.auth.getSession();
 if(s.error)throw s.error;
 if(!s.data?.session)throw new Error('Please log in before joining a group.');
 return s.data.session;
}

async function join(){
 try{
  await requireSession();
  const name=$('join-group-name')?.value.trim();
  const code=$('join-group-code')?.value.trim().toUpperCase();
  if(!name)return alert('Enter the exact group name.');
  if(!/^[A-Z0-9]{5}$/.test(code))return alert('Enter the 5-character group code.');
  const r=await db.rpc('join_group_secure',{p_group_name:name,p_password:code});
  console.log('join_group_secure result',r);
  if(r.error)throw r.error;
  alert('You joined '+(r.data?.name||name)+' successfully.');
  window.location.reload();
 }catch(e){console.error('JOIN FAILED',e);alert(e?.message||'Unable to join this group.');}
}

async function create(){
 try{
  await requireSession();
  const name=$('create-group-name')?.value.trim();
  if(!name)return alert('Enter a group name.');
  const r=await db.rpc('create_group_secure',{p_name:name});
  if(r.error)throw r.error;
  const code=String(r.data?.join_code||r.data?.password||'').toUpperCase();
  if(!/^[A-Z0-9]{5}$/.test(code))throw new Error('The server did not return a valid 5-character group code.');
  alert('Group created!\n\nYour permanent 5-character group code is:\n'+code+'\n\nShare this code with the people you want to join.');
  window.location.reload();
 }catch(e){console.error('CREATE FAILED',e);alert(e?.message||'Unable to create group.');}
}

function replaceText(root,oldText,newText){
 if(!root||!oldText||!newText||oldText===newText)return;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
 while(w.nextNode())nodes.push(w.currentNode);
 nodes.forEach(n=>{if(n.nodeValue.includes(oldText))n.nodeValue=n.nodeValue.split(oldText).join(newText)});
}

async function refreshCodes(){
 if(!db)return;
 const r=await db.from('groups').select('code,join_code').not('join_code','is',null);
 if(r.error)return;
 (r.data||[]).forEach(g=>{
  const panel=$('host-panel-'+g.code); if(!panel)return;
  replaceText(panel,g.code,String(g.join_code).toUpperCase());
  panel.querySelectorAll('[data-new-code],[data-set-group-password]').forEach(x=>x.remove());
 });
}

function clickGuard(e){
 const t=e.target?.closest?.('#join-accordion-body .btn-submit');
 if(!t)return;
 if(t.dataset.groupJoinButton==='1')return;
 e.preventDefault(); e.stopImmediatePropagation(); join();
}

function setup(){
 buildJoin(); buildCreate();
 window.joinGroup=join; window.createGroup=create;
 refreshCodes();
}

function install(){
 document.addEventListener('click',clickGuard,true);
 setup();
 new MutationObserver(()=>{buildJoin();buildCreate();}).observe(document.body,{childList:true,subtree:true});
 setInterval(()=>{buildJoin();buildCreate();},1000);
 setInterval(refreshCodes,2000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
