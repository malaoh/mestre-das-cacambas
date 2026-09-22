// TROCAR: número real da central em formato internacional sem símbolos
// (ex.: '5511987654321'). Todo CTA do site liga pra esse número — é o único
// canal de pedido/orçamento hoje (sem formulário, sem preço publicado).
const WHATSAPP_NUMBER = '5531990980148';

const selector = document.querySelector('.product-selector');
const measure = document.querySelector('.measurement-progress');
const comparatorCta = document.querySelector('#comparator-whatsapp-cta');
comparatorCta?.addEventListener('click',() => document.dispatchEvent(new CustomEvent('mestre:event',{detail:{name:'whatsapp_submit'}})));
let selectedSize = 5;

function waLink(message){
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function selectProduct(size, focus = false){
  if(!selector) return;
  const buttons = [...selector.querySelectorAll('button')];
  const index = buttons.findIndex(button => button.dataset.size === String(size));
  if(index < 0) return;
  buttons.forEach((button,i) => {
    button.setAttribute('aria-checked', String(i === index));
    button.tabIndex = i === index ? 0 : -1;
  });
  selectedSize = Number(size);
  if(measure) measure.style.width = `${(index + 1) * 20}%`;
  if(focus) buttons[index].focus();
  document.dispatchEvent(new CustomEvent('mestre:event',{detail:{name:'product_select',size:selectedSize}}));
  if(comparatorCta){
    comparatorCta.href = waLink(`Olá! Quero fazer um pedido de caçamba de ${selectedSize} m³. Pode me passar o orçamento e a disponibilidade?`);
    comparatorCta.target = '_blank';
    comparatorCta.rel = 'noopener';
  }
}

selector?.addEventListener('click',event => {
  const button = event.target.closest('button[data-size]');
  if(button) selectProduct(button.dataset.size);
});
selector?.addEventListener('keydown',event => {
  if(!['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...selector.querySelectorAll('button')];
  const current = buttons.findIndex(button => button.getAttribute('aria-checked') === 'true');
  const next = (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  selectProduct(buttons[next].dataset.size,true);
});

// ---- localizador rápido do hero: manda direto pro WhatsApp com a cidade
// digitada — não passa por nenhum formulário intermediário.
document.querySelector('#hero-quick-form')?.addEventListener('submit',event => {
  event.preventDefault();
  const city = event.target.elements.quickCity.value.trim();
  if(!city) return;
  document.dispatchEvent(new CustomEvent('mestre:event',{detail:{name:'whatsapp_submit'}}));
  window.open(waLink(`Olá! Quero fazer um pedido de caçamba em ${city}. Pode me ajudar com o orçamento?`),'_blank','noopener');
});

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

// ---- todo CTA do site vai pro WhatsApp ------------------------------------
// Qualquer elemento com [data-wa] usa a mensagem em data-wa como texto do
// wa.me; sem data-wa, cai numa mensagem genérica. WHATSAPP_NUMBER é a única
// fonte da verdade — trocar o número lá em cima já atualiza todo mundo aqui.
function wireWhatsappCtas(){
  const genericMsg = 'Olá! Quero saber mais sobre aluguel de caçamba.';
  document.querySelectorAll('[data-wa]').forEach(el => {
    const msg = el.dataset.wa || genericMsg;
    el.href = waLink(msg);
    el.target = '_blank';
    el.rel = 'noopener';
    el.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('mestre:event',{detail:{name: el.dataset.waEvent || 'whatsapp_submit'}}));
    });
  });
  document.querySelectorAll('.site-footer__pending').forEach(el => el.textContent = 'WhatsApp da central ativo');
}

selectProduct(5);
wireWhatsappCtas();
