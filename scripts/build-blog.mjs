#!/usr/bin/env node
// Gera blog/*.html (conteúdo informacional real, sem inventar dado) + blog/index.html
// a partir de UMA lista de artigos + UM template. Zero JS, mesmo shell visual das
// páginas de cidade (.city-header, .breadcrumb, .city-hero).
//
// Ferramenta de build local, não roda em produção. Rodar de novo sempre que o
// conteúdo dos artigos mudar:
//   node scripts/build-blog.mjs
//
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'blog');
const DOMAIN = 'https://mestredascacambas.com.br'; // domínio real de produção

mkdirSync(OUT_DIR, { recursive: true });

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- artigos: conteúdo informacional real, genérico, sem estatística inventada ----
const ARTICLES = [
  {
    slug: 'qual-cacamba-escolher-para-cada-reforma',
    title: 'Qual caçamba escolher para cada tipo de reforma',
    description: 'Guia prático dos volumes de caçamba (3 a 10 m³) e qual combina com reparo pequeno, reforma média ou obra maior.',
    heroPhoto: 'cacamba-na-obra.webp',
    intro: 'Errar o volume custa caro dos dois lados: caçamba pequena demais vira uma segunda viagem; grande demais é pagar por espaço vazio. A escolha certa depende do tamanho real da obra, não só da vontade de "sobrar espaço".',
    sections: [
      {
        h: 'Reparos pequenos e trocas pontuais',
        p: 'Troca de piso de um cômodo, reforma de banheiro, pequenas demolições internas: normalmente cabem no volume de 3 m³, o menor da linha. É o volume mais comum para quem está fazendo um único ambiente.',
      },
      {
        h: 'Reforma de médio porte',
        p: 'Cozinha completa, dois ambientes, troca de revestimento em área maior: os volumes de 4 m³ e 5 m³ costumam ser o ponto de equilíbrio. O de 5 m³ é o mais pedido porque cobre a maioria das reformas residenciais sem sobra nem falta.',
      },
      {
        h: 'Obras maiores e demolições parciais',
        p: 'Ampliação, demolição de parede estrutural, reforma de mais de três ambientes ao mesmo tempo: os volumes de 7 m³ e 10 m³ evitam múltiplas trocas de caçamba no meio da obra.',
      },
      {
        h: 'Um critério simples',
        p: 'Se você não tem certeza, é mais seguro estimar por cima entre dois volumes vizinhos do que arriscar uma segunda entrega no meio da obra. O atendimento também ajuda a confirmar o volume mais adequado ao descrever o serviço.',
      },
    ],
    ctaLabel: 'Ver os 5 volumes e preços',
  },
  {
    slug: 'o-que-pode-e-nao-pode-ir-na-cacamba',
    title: 'O que pode e o que não pode ir na caçamba de entulho',
    description: 'O que é aceito numa caçamba de entulho de obra e o que exige descarte separado por lei.',
    heroPhoto: 'entulho-carregando.webp',
    intro: 'A caçamba é para resíduo de construção civil — não é uma lixeira geral. Misturar o tipo errado atrasa a retirada e pode gerar problema com a legislação de resíduos sólidos do seu município.',
    sections: [
      {
        h: 'O que normalmente pode',
        p: 'Entulho de obra em geral: tijolo, concreto, argamassa, cerâmica, azulejo quebrado, madeira de demolição e gesso em pequena quantidade. Poda de jardim em volume pequeno costuma ser aceita quando combinada previamente.',
      },
      {
        h: 'O que normalmente não pode',
        p: 'Lixo doméstico e orgânico, resíduos perigosos (tinta, solvente, óleo, produtos químicos), amianto, eletrônicos e pneus não vão junto com entulho comum. Esses materiais têm rota de descarte própria, regulada pela Política Nacional de Resíduos Sólidos (Lei 12.305/2010), e exigem destino específico — não a caçamba de obra.',
      },
      {
        h: 'Por que isso importa',
        p: 'O tipo de resíduo declarado no pedido também influencia a análise de disponibilidade e as regras do seu município. Informar corretamente evita atraso na retirada e problema com a fiscalização local.',
      },
      {
        h: 'Na dúvida',
        p: 'Descreva o tipo de resíduo no pedido com o máximo de detalhe possível. A central confirma o que é aceito de acordo com a legislação da sua cidade antes de fechar a locação.',
      },
    ],
    ctaLabel: 'Fazer meu pedido',
  },
  {
    slug: 'quanto-tempo-posso-ficar-com-a-cacamba',
    title: 'Quanto tempo posso ficar com a caçamba alugada',
    description: 'Como funciona o prazo de locação da caçamba e a condição especial para períodos acima de 7 dias.',
    heroPhoto: 'logistica-lateral.webp',
    intro: 'O prazo da caçamba deveria acompanhar o ritmo real da obra — não o contrário. Planejar esse tempo evita pagar por dias parados e evita também o risco de ficar sem caçamba no meio do serviço.',
    sections: [
      {
        h: 'Como o prazo é definido',
        p: 'O período de permanência é combinado diretamente no pedido, de acordo com o andamento da sua obra. Não existe um prazo fixo único para todo mundo — ele é ajustado à necessidade real informada.',
      },
      {
        h: 'Locações acima de 7 dias',
        p: 'Períodos mais longos, acima de uma semana, têm condição especial de valor. Essa condição é informada pelo atendimento no momento da confirmação, junto com as demais regras aplicáveis à sua cidade.',
      },
      {
        h: 'Como evitar tempo parado',
        p: 'Vale alinhar a entrega para o início efetivo da geração de entulho (não semanas antes), e a retirada para o fim real da etapa suja da obra. Isso evita a caçamba ocupando espaço na rua ou no terreno sem necessidade.',
      },
    ],
    ctaLabel: 'Falar com a central',
  },
  {
    slug: 'cacamba-para-reforma-pequena',
    title: 'Caçamba para reforma pequena: vale a pena?',
    description: 'Quando alugar caçamba compensa mesmo em reformas pequenas, e o que verificar antes de pedir.',
    heroPhoto: 'roll-on.webp',
    intro: 'A ideia de que caçamba é "coisa de obra grande" é o motivo pelo qual muita gente carrega entulho em sacos, várias vezes, em carro particular. Para a maioria das reformas pequenas, o menor volume da linha já resolve com menos esforço e menos viagens.',
    sections: [
      {
        h: 'Quando compensa',
        p: 'Troca de piso, reforma de banheiro, demolição de um único ambiente: o volume de 3 m³, o menor disponível, normalmente cobre esse tipo de serviço numa única entrega — sem múltiplas viagens carregando entulho manualmente.',
      },
      {
        h: 'O que verificar antes de pedir',
        p: 'Se a caçamba vai ficar na via pública, alguns municípios exigem autorização da prefeitura (TPU ou equivalente) para apoiar o equipamento na rua; dentro do terreno ou da obra, isso normalmente não é necessário. A central confirma a exigência da sua cidade antes da entrega.',
      },
      {
        h: 'O ganho real',
        p: 'Menos tempo carregando material, menos desgaste físico, e o entulho sai do caminho da obra em vez de se acumular. Para reformas pequenas, esse ganho de tempo costuma pesar mais que o custo do aluguel.',
      },
    ],
    ctaLabel: 'Escolher minha caçamba',
  },
];

function articlePage(article) {
  const url = `${DOMAIN}/blog/${article.slug}.html`;
  const title = `${article.title} | Mestre das Caçambas`;

  const schemaBlocks = [
    {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: article.title,
      description: article.description,
      publisher: { '@type': 'Organization', name: 'Mestre das Caçambas' },
      mainEntityOfPage: url,
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${DOMAIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${DOMAIN}/blog/index.html` },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ];

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(article.description)}">
  <meta name="theme-color" content="#11100F">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(article.description)}">
  <meta property="og:type" content="article">
  <link rel="canonical" href="${url}">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%2311100F'/><path d='M5 8h12l3 3h7' fill='none' stroke='%238D1027' stroke-width='3'/><path d='M6 15h20v9H6z' fill='%23F4EFE7'/></svg>">
  <link rel="stylesheet" href="../scrollcraft.css">
  <link rel="stylesheet" href="../styles.css">
${schemaBlocks.map(b => `  <script type="application/ld+json">\n  ${JSON.stringify(b)}\n  </script>`).join('\n')}
</head>
<body>
  <header class="city-header" aria-label="Navegação">
    <a class="brand" href="../index.html" aria-label="Mestre das Caçambas, início">
      <img src="../assets/brand/logo-negativo.svg" width="170" height="45" alt="Mestre das Caçambas">
    </a>
    <a class="header-cta" href="../index.html#comparador">Ver preços e comparador</a>
  </header>

  <nav aria-label="Trilha">
    <ol class="breadcrumb">
      <li><a href="../index.html">Início</a></li>
      <li><a href="index.html">Blog</a></li>
      <li>${escapeHtml(article.title)}</li>
    </ol>
  </nav>

  <main>
    <section class="city-hero">
      <div class="city-hero__media" aria-hidden="true">
        <img src="../assets/media/${article.heroPhoto}" width="1672" height="941" alt="" loading="eager" decoding="async">
      </div>
      <div class="sc-wrap">
        <div class="city-hero__body">
          <p class="city-hero__eyebrow">Blog Mestre das Caçambas</p>
          <h1>${escapeHtml(article.title)}</h1>
          <p>${escapeHtml(article.description)}</p>
        </div>
      </div>
    </section>

    <section class="sc-section flow-section flow-section--tight">
      <div class="sc-wrap">
        <article class="article-body">
          <p>${escapeHtml(article.intro)}</p>
${article.sections.map(s => `          <h2>${escapeHtml(s.h)}</h2>\n          <p>${escapeHtml(s.p)}</p>`).join('\n')}
        </article>
        <a class="primary-action" href="../index.html#comparador" style="margin-top:1rem">${escapeHtml(article.ctaLabel)}</a>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="sc-wrap site-footer__grid">
      <div class="site-footer__brand">
        <img src="../assets/brand/logo-negativo.svg" width="170" height="46" alt="Mestre das Caçambas">
        <p>Entulho parado não espera. Escolha o volume, confirme com a central e resolva — sem ligação, sem enrolação.</p>
        <a class="text-cta" href="../index.html#pedido">Fazer meu pedido <span aria-hidden="true">→</span></a>
      </div>
      <nav class="site-footer__col" aria-label="Navegação do rodapé">
        <p class="site-footer__heading">Navegação</p>
        <a href="../index.html#comparador">Caçambas e preços</a>
        <a href="../index.html#confianca">Por que confiar</a>
        <a href="../index.html#faq">Perguntas frequentes</a>
        <a href="index.html">Todos os artigos</a>
        <a href="../cidades/index.html">Cidades atendidas</a>
      </nav>
      <div class="site-footer__col">
        <p class="site-footer__heading">Contato</p>
        <p class="site-footer__pending">WhatsApp da central em conexão</p>
        <p>Disponibilidade, resíduos aceitos, permanência e taxas são sempre confirmados no atendimento.</p>
      </div>
    </div>
    <div class="sc-wrap site-footer__bottom">
      <p>&copy; Mestre das Caçambas. Preços informados pelo cliente; sujeitos à confirmação de disponibilidade. <a href="../privacidade.html">Política de Privacidade</a></p>
    </div>
  </footer>
</body>
</html>
`;
}

function hubPage() {
  const cards = ARTICLES.map(a => `<li><a href="${a.slug}.html"><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.description)}</span></a></li>`).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Blog | Mestre das Caçambas</title>
  <meta name="description" content="Guias práticos sobre aluguel de caçamba: qual volume escolher, o que pode ir no entulho, prazos e regras.">
  <meta name="theme-color" content="#11100F">
  <link rel="canonical" href="${DOMAIN}/blog/index.html">
  <link rel="stylesheet" href="../scrollcraft.css">
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <header class="city-header" aria-label="Navegação">
    <a class="brand" href="../index.html" aria-label="Mestre das Caçambas, início">
      <img src="../assets/brand/logo-negativo.svg" width="170" height="45" alt="Mestre das Caçambas">
    </a>
    <a class="header-cta" href="../index.html#comparador">Ver preços e comparador</a>
  </header>
  <main>
    <section class="sc-section flow-section" aria-labelledby="blog-title">
      <div class="sc-wrap">
        <h2 id="blog-title">Guias <span class="ink">práticos</span></h2>
        <p>O que saber antes de alugar uma caçamba: volume certo, o que pode ir no entulho, prazos e regras locais.</p>
        <ul class="article-grid" aria-label="Artigos">${cards}</ul>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="sc-wrap site-footer__bottom">
      <p>&copy; Mestre das Caçambas. Preços informados pelo cliente; sujeitos à confirmação de disponibilidade. <a href="../privacidade.html">Política de Privacidade</a></p>
    </div>
  </footer>
</body>
</html>
`;
}

ARTICLES.forEach(article => {
  writeFileSync(join(OUT_DIR, `${article.slug}.html`), articlePage(article));
});
writeFileSync(join(OUT_DIR, 'index.html'), hubPage());

console.log(`Gerados ${ARTICLES.length} artigos + blog/index.html em ${OUT_DIR}`);
