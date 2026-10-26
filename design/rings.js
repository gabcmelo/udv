(function(){
/* Anéis de limite: sobrescreve só a visualização das janelas (wins) e o texto do Claude (det/ACT/avisos). */
var orig={wins:wins,det:det};
var VARS={
 A:{n:'Donuts por linha',r:true,d:'Um donut de 28 px ao lado de cada limite. A lista mantém o ritmo de linhas e o texto fica à direita.'},
 B:{n:'Donuts lado a lado',r:false,d:'Dois ou três donuts de 54 px abaixo do nome da conta. Gráfico mais legível, mas a conta fica bem mais alta.'},
 C:{n:'Anéis concêntricos',r:false,d:'Um conjunto compacto de anéis por conta, com legenda de cor por janela. O menor gráfico, mas depende da legenda.'}
};
var KEYS=['A','B','C'];
var params=new URLSearchParams(location.search);
var variant=/^[abc]$/i.test(params.get('variant')||'')?params.get('variant').toUpperCase():'C';

/* ---------- Novo cenário e textos do Claude (consulta automática de /usage) ---------- */
DATA.extremes=function(){return [
 A(1,'claude','Pessoal','Max','pessoal@exemplo.com',2,[W('5 h',0,'19:30'),W('Semana',100,'sex 09:00'),W('Sonnet semanal',64,'sex 09:00')],{fav:true}),
 A(2,'claude','Estudos','Pro','estudos@exemplo.com',3,[W('5 h',100,'17:10'),W('Semana',55,'sex 09:00'),W('Opus semanal',0,'sex 09:00')]),
 A(3,'codex','Trabalho','Plus','trabalho@exemplo.com',1,[W('5 h',0,'19:45'),W('Semana',0,'qui 10:26')]),
 A(4,'codex','Projeto B','Pro','projetob@exemplo.com',1,[W('5 h',100,'17:40'),W('Semana',100,'qui 10:26')])
]};
SCN.extremes='Extremos';
seg($('#scSeg'),Object.entries(SCN),function(){return S.sc},setScenario);

var COPY=[
 ['Ainda sem leitura. Envie uma mensagem no Claude Code deste perfil para receber os limites.','Ainda sem leitura. O UDV consulta o /usage do Claude a cada 20 min; você pode atualizar após 1 min.'],
 ['Os limites do Claude mudam depois de uma resposta no Claude Code.','O UDV consulta o /usage do Claude a cada 20 min. A consulta manual libera após 1 min e respeita bloqueios.']
];
function copy(h){
 COPY.forEach(function(p){h=h.split(p[0]).join(p[1])});
 return h.split(CL).join('<button class="lk" data-act="refresh">Atualizar</button>');
}
det=function(a,s){
 return orig.det(a,s).split('Claude Code: muda depois de uma resposta no perfil gerenciado.').join('Claude Code: consulta automática do /usage a cada 20 min; manual após 1 min, respeitando bloqueios.');
};
ACT.refresh=function(){say('Demonstração: consultaria o /usage do Claude (manual após 1 min, respeitando bloqueios) e o Codex agora. Nenhuma consulta real foi feita.')};

/* ---------- SVG ---------- */
var TAU=2*Math.PI;
function f(n){return Math.round(n*100)/100}
function wstate(w,ok){
 if(w.used==null||w.exp)return 'unk';
 if(!ok)return 'dim';
 return w.used>=100?'out':w.used>=80?'near':'ok';
}
function meta(w,k){
 var t='renova '+w.reset;
 if(k==='unk')return {name:w.l,used:'—',left:'',sub:w.exp?'venceu às '+w.reset+', sem leitura nova':'sem leitura',tip:'Sem leitura confirmada'};
 return {
  name:w.l,used:'usado <b>'+w.used+'%</b>',left:'restam '+(100-w.used)+'%',
  sub:k==='out'?'esgotada, '+t:k==='near'?'perto do limite, '+t:k==='dim'?'leitura antiga, '+t:t,
  tip:k==='dim'?'Leitura antiga: valores da última leitura':''
 };
}
/* Anel de CONSUMIDO: começa às 12h, sentido horário; fechar = chegar ao limite. */
function arc(c,r,sw,i,w,k){
 if(k==='unk')return '<circle class="ring-unk" cx="'+c+'" cy="'+c+'" r="'+r+'" stroke-width="'+sw+'"/>';
 var C=TAU*r,u=Math.max(0,Math.min(100,w.used));
 var h='<circle class="ring-track" cx="'+c+'" cy="'+c+'" r="'+r+'" stroke-width="'+sw+'"/>';
 if(u>0)h+='<circle class="ring-arc ring-c'+(i%3)+'" cx="'+c+'" cy="'+c+'" r="'+r+'" stroke-width="'+sw+'" stroke-linecap="'+(u>=6&&u<100?'round':'butt')+'" stroke-dasharray="'+f(C*u/100)+' '+f(C)+'" transform="rotate(-90 '+c+' '+c+')"/>';
 return h;
}
/* Ícones no centro: ▲ perto do limite, ■ esgotada, relógio leitura antiga, traço sem leitura. */
function glyph(c,k,s){
 var g='';
 if(k==='near')g='<path class="ring-gnear" d="M'+c+' '+(c-3.4)+'L'+(c+3.6)+' '+(c+2.8)+'H'+(c-3.6)+'Z"/>';
 else if(k==='out')g='<rect class="ring-gout" x="'+(c-2.7)+'" y="'+(c-2.7)+'" width="5.4" height="5.4" rx="1"/>';
 else if(k==='dim')g='<g class="ring-gl"><circle cx="'+c+'" cy="'+c+'" r="3.6"/><path d="M'+c+' '+(c-2)+'V'+c+'H'+(c+1.6)+'"/></g>';
 else if(k==='unk')g='<path class="ring-gl" d="M'+(c-2.6)+' '+c+'H'+(c+2.6)+'"/>';
 return g?'<g transform="translate('+c+' '+c+') scale('+s+') translate('+(-c)+' '+(-c)+')">'+g+'</g>':'';
}
function svg(size,body,dim){
 return '<svg class="ring-svg'+(dim?' ring-dim':'')+'" width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" aria-hidden="true" focusable="false">'+body+'</svg>';
}
function single(w,i,k,size,sw,gs){
 var c=size/2;
 return svg(size,arc(c,(size-sw)/2,sw,i,w,k)+glyph(c,k,gs),k==='dim');
}
function tip(m){return m.tip?' title="'+m.tip+'"':''}

/* ---------- Variantes ---------- */
function rowsA(a,ok){
 return a.wins.map(function(w,i){
  var k=wstate(w,ok),m=meta(w,k);
  return '<div class="ring-row ring-st-'+k+'"'+tip(m)+'>'+single(w,i,k,28,4.5,1)+
   '<span class="ring-lab"><b class="ring-name">'+m.name+'</b><span class="ring-sub">'+m.sub+'</span></span>'+
   '<span class="ring-val"><span class="ring-used">'+m.used+'</span><span class="ring-left">'+m.left+'</span></span></div>';
 }).join('');
}
function tilesB(a,ok){
 var n=a.wins.length;
 return '<div class="ring-Bwrap'+(n===1?' ring-n1':'')+'" style="--n:'+n+'">'+a.wins.map(function(w,i){
  var k=wstate(w,ok),m=meta(w,k);
  return '<div class="ring-tile ring-st-'+k+'"'+tip(m)+'>'+single(w,i,k,54,7,1.5)+
   '<b class="ring-name">'+m.name+'</b><span class="ring-used">'+m.used+'</span><span class="ring-left">'+m.left+'</span><span class="ring-sub">'+m.sub+'</span></div>';
 }).join('')+'</div>';
}
function concentricC(a,ok){
 var ws=a.wins,n=ws.length,sw=6,gap=2,size=n>=3?68:n===2?56:44,c=size/2,body='',ks=[],legend='';
 ws.forEach(function(w,i){
  var k=wstate(w,ok),m=meta(w,k);
  ks.push(k);
  body+=arc(c,(size-sw)/2-i*(sw+gap),sw,i,w,k);
  legend+='<div class="ring-lrow ring-st-'+k+'"'+tip(m)+'><i class="ring-sw ring-sw-'+(k==='unk'?'unk':i%3)+'"></i>'+
   '<span class="ring-lab"><b class="ring-name">'+m.name+'</b><span class="ring-sub">'+m.sub+'</span></span>'+
   '<span class="ring-val"><span class="ring-used">'+m.used+'</span><span class="ring-left">'+m.left+'</span></span></div>';
 });
 var g=ks.indexOf('out')>=0?'out':ks.indexOf('near')>=0?'near':ks.every(function(k){return k==='unk'})?'unk':ks.indexOf('dim')>=0?'dim':'';
 return '<div class="ring-Cwrap">'+svg(size,body+glyph(c,g,.9),ks.indexOf('dim')>=0)+'<div class="ring-leg">'+legend+'</div></div>';
}
/* Conta sem nenhuma janela: anel neutro tracejado com —, nunca 0%. */
function placeholder(){
 var m={name:'Limites',used:'—',left:'',sub:'sem leitura'};
 if(variant==='B')return '<div class="ring-Bwrap ring-n1" style="--n:1"><div class="ring-tile ring-st-unk">'+single({},0,'unk',54,7,1.5)+'<b class="ring-name">'+m.name+'</b><span class="ring-used">'+m.used+'</span><span class="ring-sub">'+m.sub+'</span></div></div>';
 if(variant==='C')return '<div class="ring-Cwrap">'+svg(44,arc(22,19,6,0,{},'unk')+glyph(22,'unk',.9))+'<div class="ring-leg"><div class="ring-lrow ring-st-unk"><i class="ring-sw ring-sw-unk"></i><span class="ring-lab"><b class="ring-name">'+m.name+'</b><span class="ring-sub">'+m.sub+'</span></span><span class="ring-val"><span class="ring-used">'+m.used+'</span></span></div></div></div>';
 return '<div class="ring-row ring-st-unk">'+single({},0,'unk',28,4.5,1)+'<span class="ring-lab"><b class="ring-name">'+m.name+'</b><span class="ring-sub">'+m.sub+'</span></span><span class="ring-val"><span class="ring-used">'+m.used+'</span></span></div>';
}

/* Mantém os avisos/estados originais (reconectar, sem conexão, sem leitura, antiga) e troca só as linhas de janela. */
var ROW=/<div class="wr[ "][^>]*>(?:(?!<\/div>)[\s\S])*<\/div>/g;
wins=function(a,s){
 var hints=copy(orig.wins(a,s).replace(ROW,''));
 var ok=fresh(a),R;
 if(!a.wins.length)R=placeholder();
 else R=variant==='B'?tilesB(a,ok):variant==='C'?concentricC(a,ok):rowsA(a,ok);
 R='<div class="ring-provider ring-provider-'+a.prov+'">'+R+'</div>';
 return (!a.wins.length||s==='stale'||s==='expired')?R+hints:hints+R;
};

/* ---------- Barra de variantes (fora do desktop simulado) ---------- */
var bar=document.createElement('div');
bar.className='ring-bar';
bar.setAttribute('role','group');
bar.setAttribute('aria-label','Variantes dos anéis (controle do estudo, fora da proposta)');
bar.innerHTML=
 '<div class="ring-nav"><button type="button" class="ring-btn" data-d="-1" aria-label="Variante anterior">‹</button>'+
 '<span class="ring-tabs">'+KEYS.map(function(k){return '<button type="button" class="ring-btn" data-v="'+k+'" aria-pressed="false">'+k+'</button>'}).join('')+'</span>'+
 '<button type="button" class="ring-btn" data-d="1" aria-label="Próxima variante">›</button></div>'+
 '<div class="ring-now" aria-live="polite"></div>'+
 '<div class="ring-legend">'+
  '<span>Anel = <b>consumido</b>: fechar o anel é chegar ao limite. O texto sempre diz usado e restam.</span>'+
  '<span class="ring-lg"><i class="ring-sw ring-brand-claude"></i>Claude · laranja</span>'+
  '<span class="ring-lg"><i class="ring-sw ring-brand-codex"></i>Codex · off-white</span>'+
  '<span>Tons da mesma cor distinguem as janelas; consulte os rótulos.</span>'+
  '<span class="ring-lg"><i class="ring-sw ring-sw-unk"></i>tracejado com —: sem leitura ou janela vencida</span>'+
  '<span class="ring-lg"><span class="ring-lw">▲</span>perto do limite</span>'+
  '<span class="ring-lg"><span class="ring-lo">■</span>esgotada</span>'+
  '<span class="ring-lg">relógio: leitura antiga, anel atenuado</span>'+
  '<span>Janelas nunca são somadas. ← → trocam a variante.</span>'+
 '</div>';
document.querySelector('.ctl').after(bar);

function setVariant(v){
 variant=v;S.variant=v;
 screen.setAttribute('data-ring-variant',v);
 bar.querySelectorAll('[data-v]').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-v')===v)});
 var d=VARS[v];
 bar.querySelector('.ring-now').innerHTML='<b>Variante '+v+(v==='C'?' (escolhida)':'')+': '+d.n+'.</b> '+d.d;
 try{var u=new URL(location.href);u.searchParams.set('variant',v);history.replaceState(null,'',u.search+u.hash)}catch(e){}
 render();
 if(S.open)place();
}
function step(d){setVariant(KEYS[(KEYS.indexOf(variant)+d+KEYS.length)%KEYS.length])}
bar.addEventListener('click',function(e){
 var b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-v'))setVariant(b.getAttribute('data-v'));
 else if(b.hasAttribute('data-d'))step(+b.getAttribute('data-d'));
});
document.addEventListener('keydown',function(e){
 if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
 if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
 var t=e.target;
 if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||(t.closest&&t.closest('[role=menu]'))))return;
 e.preventDefault();
 step(e.key==='ArrowRight'?1:-1);
});

/* Parâmetro opcional ?scenario=extremes para abrir direto num cenário */
var sc=params.get('scenario');
if(sc&&DATA[sc]){setScenario(sc);seg($('#scSeg'),Object.entries(SCN),function(){return S.sc},setScenario)}
setVariant(variant);
})();
