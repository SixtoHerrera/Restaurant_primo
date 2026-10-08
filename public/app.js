const $=s=>document.querySelector(s);const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let menu=[],cart=[],key=null,timer;
const baseCategories=['Tacos','Tortas','Burritos','Fin de semana','Quesadillas'];
let selectedCategory=null,loading=false,loadError=false;
const normalize=s=>s.trim().toLocaleLowerCase('es');
function categoryList(){const result=[...baseCategories];menu.forEach(p=>{if(!result.some(c=>normalize(c)===normalize(p.category)))result.push(p.category);});return result;}
function drawMenu(){
 const categories=categoryList();
 $('#categories').innerHTML=categories.map((c,n)=>`<button class="category-card" data-category="${n}"><span class="category-mark" aria-hidden="true">${String(n+1).padStart(2,'0')}</span><strong>${esc(c)}</strong><span>Ver productos →</span></button>`).join('');
 $('#categories').classList.toggle('hidden',selectedCategory!==null);
 $('#menu').classList.toggle('hidden',selectedCategory===null);
 $('#screen-title').textContent=selectedCategory||'Categorías';
 $('#screen-description').textContent=selectedCategory?'Elige tus productos y personalízalos a tu gusto.':'Elige una categoría para ver sus productos.';
 $('#back').textContent=selectedCategory?'← Categorías':'← Inicio';
 $('#menu-status').textContent=loading?'Cargando menú…':loadError?'No se pudo cargar el menú. Revisa la conexión y vuelve a intentar.':'';
 $('#retry').classList.toggle('hidden',!loadError);
 if(selectedCategory===null)return;
 const items=menu.filter(p=>normalize(p.category)===normalize(selectedCategory));
 $('#menu').innerHTML=items.map(p=>`<article class="card" data-id="${p.id}"><span class="price">${money(p.price)}</span><h3>${esc(p.name)}</h3><p>Elige tus complementos</p>${p.options.map((o,i)=>`<label><input type="checkbox" value="${i}">${esc(o.name)} <small>${o.price?'+'+money(o.price):'Gratis'}</small></label>`).join('')}<label>Cantidad <input class="qty" type="number" min="1" max="50" value="1"></label><button class="add">Agregar a mi orden +</button></article>`).join('')||(!loading&&!loadError?'<div class="card empty-category"><h3>Próximamente</h3><p>Aún no hay productos disponibles en esta categoría. Puedes seguir explorando las demás.</p></div>':'');
}
async function load(){loading=true;loadError=false;drawMenu();try{const r=await fetch('/api/menu');if(!r.ok)throw Error('Menú no disponible');menu=await r.json();}catch{loadError=true;menu=[];}finally{loading=false;drawMenu();}}
function showCategories(){selectedCategory=null;drawMenu();$('#screen-title').focus();}
$('#start').onclick=()=>{$('#welcome').classList.add('hidden');$('#ordering').classList.remove('hidden');showCategories();load();};
$('#categories').onclick=e=>{const button=e.target.closest('[data-category]');if(!button)return;selectedCategory=categoryList()[Number(button.dataset.category)];drawMenu();$('#screen-title').focus();};
$('#back').onclick=()=>{if(selectedCategory!==null){showCategories();return;}if((cart.length||$('#name').value.trim())&&!window.confirm('¿Volver al inicio y borrar este pedido sin enviar?'))return;cart=[];key=null;$('#name').value='';$('#message').textContent='';render();showWelcome();};
function showWelcome(){selectedCategory=null;$('#ordering').classList.add('hidden');$('#welcome').classList.remove('hidden');$('#start').focus();window.scrollTo(0,0);}
$('#retry').onclick=load;
$('#menu').onclick=e=>{if(!e.target.matches('.add'))return;const card=e.target.closest('.card'),p=menu.find(p=>p.id===Number(card.dataset.id)),qty=Number(card.querySelector('.qty').value);if(!Number.isInteger(qty)||qty<1||qty>50)return;cart.push({id:p.id,name:p.name,qty,options:[...card.querySelectorAll(':checked')].map(i=>p.options[Number(i.value)]),price:p.price});key=null;render();card.querySelectorAll(':checked').forEach(i=>i.checked=false);card.querySelector('.qty').value=1;};
function render(){$('#cart').innerHTML=cart.length?cart.map((i,n)=>`<div class="cartline"><strong>${i.qty} × ${esc(i.name)}</strong><small>${i.options.map(o=>esc(o.name)).join(' · ')||'Sin complementos'}</small><span>${money(i.qty*(i.price+i.options.reduce((a,o)=>a+o.price,0)))}</span> <button data-remove="${n}">Quitar</button></div>`).join(''):'<p>Tu próxima orden empieza con un taco.</p>';$('#total').textContent=money(cart.reduce((a,i)=>a+i.qty*(i.price+i.options.reduce((s,o)=>s+o.price,0)),0));$('#order').disabled=!cart.length;}
$('#cart').onclick=e=>{if(e.target.dataset.remove!==undefined){cart.splice(Number(e.target.dataset.remove),1);key=null;render();}};
function uuid(){if(crypto.randomUUID)return crypto.randomUUID();return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}
$('#order').onclick=async()=>{if(!$('#name').value.trim()){$('#message').textContent='Escribe tu nombre para continuar.';$('#name').focus();return;}$('#order').disabled=true;$('#message').textContent='Guardando tu orden…';key ||= uuid();try{const r=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,name:$('#name').value,items:cart.map(i=>({id:i.id,qty:i.qty,options:i.options.map(o=>o.name)}))})});const o=await r.json();if(!r.ok)throw Error(o.error);$('#thanks').textContent=`¡Gracias, ${o.name}!`;$('#number').textContent='#'+o.number;cart=[];key=null;$('#name').value='';render();$('#message').textContent='';$('#confirmation').showModal();timer=setTimeout(reset,25000);}catch(e){$('#message').textContent=e.message||'No se pudo confirmar. Vuelve a intentar; no se duplicará tu orden.';$('#order').disabled=false;}};
function reset(){clearTimeout(timer);$('#confirmation').close();showWelcome();load();}$('#new').onclick=reset;load();render();

