import {refreshAccess} from './cloud.js';
refreshAccess();
import {createIcons,Cog,ArrowUpRight,Play,Menu,MonitorSmartphone} from 'lucide';
createIcons({icons:{Cog,ArrowUpRight,Play,Menu,MonitorSmartphone},attrs:{'stroke-width':1.65,'aria-hidden':'true'}});
document.querySelector('#year').textContent=new Date().getFullYear();
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#site-nav');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Apri menu');nav.classList.remove('open');}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Chiudi menu':'Apri menu');nav.classList.toggle('open',open);});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
const scenes=[...document.querySelectorAll('.hero-scene')],buttons=[...document.querySelectorAll('[data-scene]')],toggle=document.querySelector('#motion-toggle'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let active=0,paused=reduced.matches,visible=true,timer;
function schedule(){clearTimeout(timer);document.body.classList.toggle('slider-motion-paused',paused||!visible||document.hidden);if(!paused&&visible&&!document.hidden)timer=setTimeout(()=>show((active+1)%scenes.length),12000);}
function show(index){active=index;scenes.forEach((scene,i)=>scene.classList.toggle('active',i===index));buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));schedule();}
function sync(){toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-label',paused?'Riprendi le immagini':'Metti in pausa le immagini');toggle.setAttribute('aria-pressed',String(paused));schedule();}
buttons.forEach((b,i)=>b.addEventListener('click',()=>show(i)));toggle.addEventListener('click',()=>{paused=!paused;sync();});reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});document.addEventListener('visibilitychange',schedule);
const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();});observer.observe(document.querySelector('.cinema-hero'));window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',schedule);sync();
