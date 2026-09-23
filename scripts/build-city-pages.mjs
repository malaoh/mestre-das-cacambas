#!/usr/bin/env node
// Gera cidades/*.html (SEO local, sem JS) + cidades/index.html (hub de
// cobertura) + sitemap.xml a partir de UMA lista de dados + UM template.
//
// Ferramenta de build local, não roda em produção — a saída continua sendo
// HTML estático puro. Rodar de novo sempre que tamanho/FAQ/copy mudar:
//   node scripts/build-city-pages.mjs
//
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'cidades');
const DOMAIN = 'https://mestredascacambas.com.br'; // domínio real de produção
const WHATSAPP_NUMBER = '5531990980148'; // mesmo número de app.js — trocar nos dois se mudar

mkdirSync(OUT_DIR, { recursive: true });

// ícone do WhatsApp, mesmo símbolo usado no index.html (id="ico-wa")
const ICO_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm5.8 14.2c-.3.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.4.2.5.7 1.7.8 1.9.1.1.1.3 0 .5-.1.2-.1.3-.3.5l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.6-.7c.2-.2.4-.2.6-.1l1.7.8c.2.1.4.2.4.4.1.2.1.9-.2 1.5Z"/></svg>';

function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// ---- dados reais (não inventar nada além do nome/UF da capital) ----------
// sem preço publicado: só tamanho. Orçamento é sempre pelo WhatsApp.
const SIZES = [
  { size: 3, tag: 'Promocional' },
  { size: 4, tag: null },
  { size: 5, tag: 'Padrão' },
  { size: 7, tag: null },
  { size: 10, tag: null },
];

const TESTIMONIALS = {
  BA: { name: 'Juliana M.', city: 'Salvador, BA', text: 'Aluguei uma caçamba para uma reforma em Salvador e fui muito bem atendida. A equipe foi ágil desde o orçamento até a retirada, sempre com muita educação e organização.' },
  MG: { name: 'Rodrigo P.', city: 'Belo Horizonte, MG', text: 'O serviço em Belo Horizonte superou minhas expectativas. A caçamba foi entregue rapidamente e o atendimento foi claro e prestativo. Recomendo para quem busca praticidade durante a obra.' },
  RS: { name: 'Patrícia S.', city: 'Porto Alegre, RS', text: 'Precisávamos retirar bastante entulho em Porto Alegre e a empresa resolveu tudo com rapidez. A entrega ocorreu no horário combinado e o suporte durante o aluguel fez toda a diferença.' },
};

const FAQ = [
  ['Como funciona a entrega e a retirada?', 'Você informa cidade, volume e tipo de resíduo pelo WhatsApp. O atendimento confirma disponibilidade e combina o dia da entrega e da retirada com você.'],
  ['Como sei quanto vou pagar?', 'O valor é informado pela central no WhatsApp, de acordo com o volume e a sua cidade. Taxas locais e tempo de permanência entram nessa conversa antes de qualquer contratação.'],
  ['Que tipo de resíduo posso colocar na caçamba?', 'Informe o tipo no WhatsApp (entulho de obra, concreto, madeira, poda). A equipe confirma o que é aceito de acordo com a legislação local.'],
  ['Por quanto tempo posso ficar com a caçamba?', 'O período é combinado com a central. Locações acima de 7 dias têm condição especial de valor, informada pelo atendimento ao confirmar.'],
  ['Atende obra pequena ou só volume grande?', 'Os volumes vão de 3 a 10 m³, para reformas pequenas ou obras maiores. Necessidades acima disso entram como consulta específica.'],
  ['Preciso de autorização da prefeitura para colocar a caçamba na rua?', 'Depende do município: caçamba apoiada em via pública costuma exigir permissão da prefeitura (TPU ou equivalente), enquanto dentro do terreno/obra normalmente não precisa. A central confirma a exigência específica da sua cidade antes da entrega.'],
];

const CITIES = [
  ['Rio Branco', 'AC'], ['Maceió', 'AL'], ['Macapá', 'AP'], ['Manaus', 'AM'],
  ['Salvador', 'BA'], ['Fortaleza', 'CE'], ['Brasília', 'DF'], ['Vitória', 'ES'],
  ['Goiânia', 'GO'], ['São Luís', 'MA'], ['Cuiabá', 'MT'], ['Campo Grande', 'MS'],
  ['Belo Horizonte', 'MG'], ['Belém', 'PA'], ['João Pessoa', 'PB'], ['Curitiba', 'PR'],
  ['Recife', 'PE'], ['Teresina', 'PI'], ['Rio de Janeiro', 'RJ'], ['Natal', 'RN'],
  ['Porto Alegre', 'RS'], ['Porto Velho', 'RO'], ['Boa Vista', 'RR'], ['Florianópolis', 'SC'],
  ['São Paulo', 'SP'], ['Aracaju', 'SE'], ['Palmas', 'TO'],
].map(([name, uf]) => ({
  name, uf,
  slug: name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  testimonial: TESTIMONIALS[uf] || null,
}));

// alterna a foto real usada na banda de topo pra não repetir a mesma sempre
const HERO_PHOTOS = ['operacao-entrega.webp', 'cacamba-na-obra.webp', 'logistica-lateral.webp'];

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sizeGridHtml() {
  return SIZES.map(s => `
            <li>
              <strong>${s.size} m³</strong>
              ${s.tag ? `<small>${s.tag}</small>` : ''}
            </li>`).join('');
}

function faqHtml() {
  return FAQ.map(([q, a]) => `
          <details class="faq-item">
            <summary>${escapeHtml(q)}</summary>
            <p>${escapeHtml(a)}</p>
          </details>`).join('');
}

function faqSchema() {
  return FAQ.map(([q, a]) => ({
    '@type': 'Question', name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  }));
}

function cityPage(city, index) {
  const url = `${DOMAIN}/cidades/aluguel-cacamba-${city.slug}.html`;
  const title = `Aluguel de Caçamba em ${city.name} | Mestre das Caçambas`;
  const description = `Aluguel de caçambas em ${city.name}, ${city.uf}. Volumes de 3 a 10 m³, orçamento rápido pelo WhatsApp, atendimento por parceiros e filiais regionais.`;
  const heroPhoto = HERO_PHOTOS[index % HERO_PHOTOS.length];
  const t = city.testimonial;
  const waCityMsg = waLink(`Olá! Quero fazer um pedido de caçamba em ${city.name}. Pode me passar o orçamento e a disponibilidade?`);
  const waCityGeneric = waLink(`Olá! Quero saber mais sobre aluguel de caçamba em ${city.name}.`);

  const schemaBlocks = [
    {
      '@context': 'https://schema.org', '@type': 'Service',
      name: `Aluguel de caçambas em ${city.name}`,
      provider: { '@type': 'Organization', name: 'Mestre das Caçambas' },
      areaServed: { '@type': 'City', name: city.name, containedInPlace: { '@type': 'State', name: city.uf } },
      description: `Locação de caçambas para obras, reformas e retirada de entulho em ${city.name}, mediante confirmação de disponibilidade e regras locais. Orçamento pelo WhatsApp.`,
      hasOfferCatalog: {
        '@type': 'OfferCatalog', name: 'Volumes de caçamba',
        itemListElement: SIZES.map(s => ({ '@type': 'Service', name: `Caçamba ${s.size} m³` })),
      },
    },
    {
      '@context': 'https://schema.org', '@type': 'LocalBusiness',
      name: `Mestre das Caçambas — ${city.name}`,
      url, areaServed: { '@type': 'City', name: city.name },
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqSchema() },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${DOMAIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Cidades atendidas', item: `${DOMAIN}/cidades/` },
        { '@type': 'ListItem', position: 3, name: city.name, item: url },
      ],
    },
  ];

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#11100F">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%2311100F'/><path d='M5 8h12l3 3h7' fill='none' stroke='%238D1027' stroke-width='3'/><path d='M6 15h20v9H6z' fill='%23F4EFE7'/></svg>">
  <link rel="stylesheet" href="../styles.css?v=5">
${schemaBlocks.map(b => `  <script type="application/ld+json">\n  ${JSON.stringify(b)}\n  </script>`).join('\n')}
</head>
<body>
  <header class="city-header" aria-label="Navegação">
    <a class="brand" href="../index.html" aria-label="Mestre das Caçambas, início">
      <img src="../assets/brand/logo-negativo.svg" width="170" height="45" alt="Mestre das Caçambas">
    </a>
    <a class="header-cta" href="${waCityMsg}" target="_blank" rel="noopener">${ICO_WA}Peça Aqui</a>
  </header>

  <nav aria-label="Trilha">
    <ol class="breadcrumb">
      <li><a href="../index.html">Início</a></li>
      <li><a href="../cidades/index.html">Cidades atendidas</a></li>
      <li>${escapeHtml(city.name)}</li>
    </ol>
  </nav>

  <main>
    <section class="city-hero">
      <div class="city-hero__media" aria-hidden="true">
        <picture>
          <source media="(max-width: 760px)" srcset="../assets/media/${heroPhoto.replace('.webp', '-mobile.webp')}">
          <img src="../assets/media/${heroPhoto}" width="1672" height="941" alt="" loading="eager" decoding="async">
        </picture>
      </div>
      <div class="sc-wrap">
        <div class="city-hero__body">
          <p class="city-hero__eyebrow">Aluguel de caçambas em ${escapeHtml(city.name)}</p>
          <h1>Sua obra em ${escapeHtml(city.name)}<br>continua. O <span class="ink">entulho</span> sai do caminho.</h1>
          <p>Atendimento em ${escapeHtml(city.name)} por parceiros e filiais regionais — mesmo processo, orçamento rápido pelo WhatsApp, sem ligação e sem espera.</p>
          <a class="primary-action" href="${waCityMsg}" target="_blank" rel="noopener">${ICO_WA}Faça Seu Pedido</a>
        </div>
      </div>
    </section>

    <section class="sc-section flow-section flow-section--tight" aria-labelledby="price-title">
      <div class="sc-wrap">
        <h2 id="price-title">Tamanhos disponíveis em ${escapeHtml(city.name)}.</h2>
        <p>Os mesmos 5 volumes usados em todo o Brasil. Orçamento e disponibilidade direto com a central, pelo WhatsApp.</p>
        <ul class="price-grid" aria-label="Volumes disponíveis">${sizeGridHtml()}
        </ul>
        <p class="price-note" style="margin-top:1.5rem">Disponibilidade e condições são confirmadas pela central no WhatsApp.</p>
        <a class="text-cta" href="${waCityMsg}" target="_blank" rel="noopener">${ICO_WA}Peça Aqui</a>
      </div>
    </section>

    <section class="sc-section flow-section flow-section--tight" aria-labelledby="process-title">
      <div class="sc-wrap">
        <h2 id="process-title">Do pedido à retirada, cada etapa no <span class="ink">lugar</span>.</h2>
        <ol class="process-list">
          <li><strong>Pedir</strong><span>Cidade, volume e tipo de resíduo — direto no WhatsApp, sem burocracia.</span></li>
          <li><strong>Confirmar</strong><span>O atendimento valida prazo, regras e disponibilidade em ${escapeHtml(city.name)}.</span></li>
          <li><strong>Coordenar</strong><span>Entrega e retirada seguem exatamente o combinado.</span></li>
        </ol>
      </div>
    </section>
${t ? `
    <section class="sc-section flow-section flow-section--tight" aria-labelledby="testimonial-title">
      <div class="sc-wrap">
        <h2 id="testimonial-title">Quem já pediu em ${escapeHtml(city.name)}</h2>
        <blockquote class="testimonial-card city-testimonial">
          <span class="testimonial-card__quote" aria-hidden="true">&ldquo;</span>
          <p>${escapeHtml(t.text)}</p>
          <cite>${escapeHtml(t.name)} <span>— ${escapeHtml(t.city)}</span></cite>
        </blockquote>
      </div>
    </section>` : ''}

    <section class="sc-section flow-section flow-section--tight" aria-labelledby="faq-title">
      <div class="sc-wrap">
        <h2 id="faq-title">Perguntas <span class="ink">frequentes</span></h2>
        <div class="faq-list">${faqHtml()}
        </div>
        <a class="text-cta" href="${waCityGeneric}" target="_blank" rel="noopener">${ICO_WA}Falar no WhatsApp</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="sc-wrap site-footer__grid">
      <div class="site-footer__brand">
        <img src="../assets/brand/logo-negativo.svg" width="170" height="46" alt="Mestre das Caçambas">
        <p>Entulho parado não espera. Escolha o volume, fale com a central pelo WhatsApp e resolva — sem ligação, sem enrolação.</p>
        <a class="text-cta" href="${waCityMsg}" target="_blank" rel="noopener">${ICO_WA}Faça Seu Pedido</a>
      </div>
      <nav class="site-footer__col" aria-label="Navegação do rodapé">
        <p class="site-footer__heading">Navegação</p>
        <a href="../index.html#comparador">Caçambas</a>
        <a href="../index.html#confianca">Por que confiar</a>
        <a href="../index.html#faq">Perguntas frequentes</a>
        <a href="../cidades/index.html">Outras cidades atendidas</a>
      </nav>
      <div class="site-footer__col">
        <p class="site-footer__heading">Cobertura</p>
        <p>Atendimento em ${escapeHtml(city.name)} e região, confirmado antes da contratação.</p>
      </div>
      <div class="site-footer__col">
        <p class="site-footer__heading">Contato</p>
        <p class="site-footer__pending">WhatsApp da central ativo</p>
        <p>Disponibilidade, resíduos aceitos, permanência e taxas são sempre confirmados no atendimento.</p>
      </div>
    </div>
    <div class="sc-wrap site-footer__bottom">
      <p>&copy; Mestre das Caçambas. Disponibilidade e condições confirmadas pela central antes da contratação. <a href="../privacidade.html">Política de Privacidade</a></p>
    </div>
  </footer>
</body>
</html>
`;
}

function hubPage() {
  const byUf = {};
  CITIES.forEach(c => { (byUf[c.uf] ||= []).push(c); });
  const list = Object.keys(byUf).sort().map(uf =>
    byUf[uf].map(c => `<li><a href="aluguel-cacamba-${c.slug}.html">${escapeHtml(c.name)}, ${uf}</a></li>`).join('')
  ).join('');
  const waGeneric = waLink('Olá! Quero saber mais sobre aluguel de caçamba.');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Cidades atendidas | Mestre das Caçambas</title>
  <meta name="description" content="Veja as capitais atendidas pela Mestre das Caçambas em todo o Brasil, por parceiros e filiais regionais.">
  <meta name="theme-color" content="#11100F">
  <link rel="canonical" href="${DOMAIN}/cidades/index.html">
  <link rel="stylesheet" href="../styles.css?v=5">
</head>
<body>
  <header class="city-header" aria-label="Navegação">
    <a class="brand" href="../index.html" aria-label="Mestre das Caçambas, início">
      <img src="../assets/brand/logo-negativo.svg" width="170" height="45" alt="Mestre das Caçambas">
    </a>
    <a class="header-cta" href="${waGeneric}" target="_blank" rel="noopener">${ICO_WA}Peça Aqui</a>
  </header>
  <main>
    <section class="sc-section flow-section" aria-labelledby="hub-title">
      <div class="sc-wrap">
        <h2 id="hub-title">Cidades <span class="ink">atendidas</span></h2>
        <p>Atendimento em todo o Brasil, por parceiros e filiais regionais. Comece pela sua capital — o orçamento é pelo WhatsApp, o mesmo processo em qualquer uma delas.</p>
        <ul class="faq-list" style="list-style:none;columns:3;gap:2rem;margin-top:2rem">${list}</ul>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="sc-wrap site-footer__bottom">
      <p>&copy; Mestre das Caçambas. Disponibilidade e condições confirmadas pela central antes da contratação. <a href="../privacidade.html">Política de Privacidade</a></p>
    </div>
  </footer>
</body>
</html>
`;
}

// mantenha sincronizado com os slugs de ARTICLES em scripts/build-blog.mjs
const BLOG_SLUGS = [
  'qual-cacamba-escolher-para-cada-reforma',
  'o-que-pode-e-nao-pode-ir-na-cacamba',
  'quanto-tempo-posso-ficar-com-a-cacamba',
  'cacamba-para-reforma-pequena',
];

function sitemapXml() {
  const urls = [
    { loc: `${DOMAIN}/`, priority: '1.0' },
    { loc: `${DOMAIN}/cidades/index.html`, priority: '0.7' },
    ...CITIES.map(c => ({ loc: `${DOMAIN}/cidades/aluguel-cacamba-${c.slug}.html`, priority: '0.8' })),
    { loc: `${DOMAIN}/blog/index.html`, priority: '0.6' },
    ...BLOG_SLUGS.map(slug => ({ loc: `${DOMAIN}/blog/${slug}.html`, priority: '0.6' })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Gerado por scripts/build-city-pages.mjs — não editar à mão. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>
`;
}

// ---- escreve tudo ----------------------------------------------------------
CITIES.forEach((city, i) => {
  writeFileSync(join(OUT_DIR, `aluguel-cacamba-${city.slug}.html`), cityPage(city, i));
});
writeFileSync(join(OUT_DIR, 'index.html'), hubPage());
writeFileSync(join(ROOT, 'sitemap.xml'), sitemapXml());

console.log(`Geradas ${CITIES.length} páginas de cidade + hub + sitemap.xml em ${OUT_DIR}`);
