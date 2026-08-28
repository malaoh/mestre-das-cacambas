// TROCAR: número real da central em formato internacional sem símbolos
// (ex.: '5511987654321'). Assim que preenchido, o botão de WhatsApp liga
// sozinho no próximo carregamento — nenhuma outra mudança de código precisa.
const WHATSAPP_NUMBER = '5546991167840';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const prices = {3:200,4:260,5:310,7:380,10:460};
const scales = {3:.76,4:.88,5:1,7:1.14,10:1.3};
const durationLabels = {'1-3':'Até 3 dias','4-7':'4 a 7 dias','7+':'Mais de 7 dias'};
const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const form = document.querySelector('#order-form');
const stateSelect = form.elements.state;
const sizeSelect = form.elements.size;
const selector = document.querySelector('.product-selector');
const measure = document.querySelector('.measurement-progress');
const status = document.querySelector('#form-status');
const summarySize = document.querySelector('#summary-size');
const summaryCity = document.querySelector('#summary-city');
const summaryWaste = document.querySelector('#summary-waste');
const summaryDuration = document.querySelector('#summary-duration');
const summaryNote = document.querySelector('#summary-note');
let threeModule;

ufs.forEach(uf => stateSelect.add(new Option(uf, uf)));

function selectProduct(size, focus = false){
  const buttons = [...selector.querySelectorAll('button')];
  const index = buttons.findIndex(button => button.dataset.size === String(size));
  if(index < 0) return;
  buttons.forEach((button,i) => {
    button.setAttribute('aria-checked', String(i === index));
    button.tabIndex = i === index ? 0 : -1;
  });
  sizeSelect.value = String(size);
  measure.style.width = `${(index + 1) * 20}%`;
  if(focus) buttons[index].focus();
  document.dispatchEvent(new CustomEvent('product-change',{detail:{size:Number(size),price:prices[size],scale:scales[size],index}}));
  document.dispatchEvent(new CustomEvent('mestre:event',{detail:{name:'product_select',size:Number(size)}}));
}

// marca que o usuário escolheu ativamente um volume (não a pré-seleção do
// mount) — usado só para decidir se vale confirmar a chegada em #pedido
let touchedComparator = false;

selector.addEventListener('click',event => {
  const button = event.target.closest('button[data-size]');
  if(button){ touchedComparator = true; selectProduct(button.dataset.size); }
});
selector.addEventListener('keydown',event => {
  if(!['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...selector.querySelectorAll('button')];
  const current = buttons.findIndex(button => button.getAttribute('aria-checked') === 'true');
  const next = (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  touchedComparator = true;
  selectProduct(buttons[next].dataset.size,true);
});
sizeSelect.addEventListener('change',() => { touchedComparator = true; selectProduct(sizeSelect.value); });

// ---- resumo do pedido ao vivo -------------------------------------------
function updateSummary(){
  const data = new FormData(form);
  const size = data.get('size');
  summarySize.textContent = `${size} m³ — R$ ${prices[size]}`;
  summaryCity.textContent = data.get('city') ? `${data.get('city')}${data.get('state') ? ' / '+data.get('state') : ''}` : 'A definir';
  summaryWaste.textContent = data.get('waste') || 'A definir';
  const duration = data.get('duration') || '1-3';
  summaryDuration.textContent = durationLabels[duration];
  summaryNote.hidden = duration !== '7+';
}
form.addEventListener('input',updateSummary);
form.addEventListener('change',updateSummary);
document.addEventListener('product-change',updateSummary);

// confirma visualmente, uma vez, que a escolha feita alhures "grudou" quando
// o leitor chega ao resumo — sem isso só quem reparasse sozinho no texto
// percebia a sincronização.
const orderSummary = document.querySelector('#order-summary');
if('IntersectionObserver' in window && orderSummary){
  const summaryObserver = new IntersectionObserver(entries => {
    if(!touchedComparator) return;
    if(entries.some(entry => entry.isIntersecting)){
      orderSummary.classList.add('is-confirmed');
      setTimeout(() => orderSummary.classList.remove('is-confirmed'), 1500);
      summaryObserver.disconnect();
    }
  },{threshold:.4});
  summaryObserver.observe(orderSummary);
}

// ---- menu mobile ----------------------------------------------------------
const navToggle = document.querySelector('#nav-toggle');
const mobileNav = document.querySelector('#mobile-nav');
if(navToggle && mobileNav){
  const closeNav = () => {
    navToggle.setAttribute('aria-expanded','false');
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  };
  const openNav = () => {
    navToggle.setAttribute('aria-expanded','true');
    mobileNav.classList.add('is-open');
    mobileNav.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
  };
  navToggle.addEventListener('click',() => {
    navToggle.getAttribute('aria-expanded') === 'true' ? closeNav() : openNav();
  });
  mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click',closeNav));
  addEventListener('keydown',event => { if(event.key === 'Escape') closeNav(); });
  matchMedia('(min-width: 901px)').addEventListener('change',event => { if(event.matches) closeNav(); });
}

async function loadThree(){
  if(reduceMotion || threeModule) return;
  try {
    threeModule = await import('./three-scene.js');
    threeModule.mountDumpster(document.querySelector('#three-stage'));
  } catch(error){
    console.warn('A experiência 3D usará o packshot de fallback.',error);
  }
}

// O comparador é o pico: monta o Three.js só quando a seção se aproxima da
// tela, não mais amarrado a um waypoint de um único voo contínuo.
const comparator = document.querySelector('#comparador');
if('IntersectionObserver' in window && comparator){
  const comparatorObserver = new IntersectionObserver(entries => {
    if(entries.some(entry => entry.isIntersecting)){
      loadThree();
      comparatorObserver.disconnect();
    }
  },{rootMargin:'40% 0px'});
  comparatorObserver.observe(comparator);
} else {
  loadThree();
}

function orderMessage(){
  const data = new FormData(form);
  const size = data.get('size');
  const duration = data.get('duration') || '1-3';
  const lines = [
    'Olá, Mestre das Caçambas! Quero confirmar um pedido:',
    `• Nome: ${data.get('name')}`,
    `• Telefone: ${data.get('phone')}`,
    `• Cidade/UF: ${data.get('city')} / ${data.get('state')}`,
    `• Volume: ${size} m³ — R$ ${prices[size]},00`,
    `• Resíduo: ${data.get('waste')}`,
    `• Quando: ${data.get('urgency')}`,
    `• Duração estimada: ${durationLabels[duration]}`,
    duration === '7+' ? '• Locação acima de 7 dias: peço a condição especial de valor.' : '',
    data.get('period') ? `• Período: ${data.get('period')}` : '',
    data.get('notes') ? `• Observações: ${data.get('notes')}` : '',
    '',
    'Aguardo a confirmação de disponibilidade, condições e regras locais.'
  ];
  const params = new URLSearchParams(location.search);
  const campaign = ['utm_source','utm_medium','utm_campaign'].map(k => params.get(k)).filter(Boolean).join(' / ');
  if(campaign) lines.push(`Origem: ${campaign}`);
  return lines.filter(Boolean).join('\n');
}

function validate(){
  if(form.checkValidity()) return true;
  form.reportValidity();
  status.textContent = 'Preencha os campos obrigatórios para montar o pedido.';
  return false;
}

form.addEventListener('submit',event => {
  event.preventDefault();
  if(!validate()) return;
  if(WHATSAPP_NUMBER){
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;
    document.dispatchEvent(new CustomEvent('mestre:event',{detail:{name:'whatsapp_submit'}}));
    window.open(url,'_blank','noopener');
    status.textContent = 'Pedido enviado para o WhatsApp da central. Confirme por lá.';
    return;
  }
  status.textContent = 'O WhatsApp da central ainda não está disponível. Tente novamente em instantes.';
});

// assim que WHATSAPP_NUMBER for preenchido (ver topo do arquivo), o hero e o
// rodapé confirmam sozinhos que o canal está ativo — o botão do formulário já
// nasce pronto no HTML, não depende deste passo.
function activateWhatsappIfReady(){
  if(!WHATSAPP_NUMBER) return;
  document.querySelectorAll('.site-footer__pending').forEach(el => el.textContent = 'WhatsApp da central ativo');

  const heroCta = document.querySelector('#hero-whatsapp-cta');
  if(heroCta){
    const msg = encodeURIComponent('Olá! Quero falar sobre aluguel de caçamba.');
    heroCta.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    heroCta.target = '_blank';
    heroCta.rel = 'noopener';
    heroCta.addEventListener('click', () => document.dispatchEvent(new CustomEvent('mestre:event',{detail:{name:'hero_whatsapp_click'}})));
  }
}

function mount(){
  if(!window.ScrollCraft) return;
  window.ScrollCraft.mount(document.body);
  selectProduct(5);
  updateSummary();
  activateWhatsappIfReady();
  requestAnimationFrame(() => dispatchEvent(new Event('resize')));
  document.fonts?.ready.then(() => dispatchEvent(new Event('resize')));
}

addEventListener('load',mount,{once:true});
addEventListener('pagehide',() => threeModule?.destroyDumpster?.(),{once:true});
