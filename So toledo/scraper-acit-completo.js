const axios = require("axios");
const cheerio = require("cheerio");
const XLSX = require("xlsx");
const cluster = require("cluster");
const os = require("os");

const BASE_URL = "https://acit.org.br/associados/";
const LETTERS = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "numero",
];

// Configurações de performance extrema
const MAX_CONCURRENT_REQUESTS = 50; // Requisições simultâneas
const TIMEOUT = 8000; // Timeout reduzido para ser mais agressivo
const RETRY_ATTEMPTS = 2; // Tentativas de retry
const DELAY_BETWEEN_BATCHES = 100; // Delay mínimo entre batches

// Pool de conexões axios para reutilização
const axiosInstance = axios.create({
  timeout: TIMEOUT,
  maxRedirects: 3,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  },
  // Pool de conexões para reutilização
  httpAgent: new (require("http").Agent)({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: TIMEOUT,
  }),
  httpsAgent: new (require("https").Agent)({
    keepAlive: true,
    maxSockets: 100,
    maxFreeSockets: 10,
    timeout: TIMEOUT,
  }),
});

// Cache em memória para evitar requisições duplicadas
const cache = new Map();

async function getCompanyLinksParallel(pages, letra) {
  console.log(`🚀 Processando ${pages.length} páginas da letra ${letra.toUpperCase()} em paralelo`);

  const promises = pages.map((page) => getCompanyLinks(page, letra));
  const results = await Promise.allSettled(promises);

  const allLinks = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      allLinks.push(...result.value);
    } else {
      console.error(
        `❌ Erro na página ${pages[index]} da letra ${letra}: ${result.reason.message}`
      );
    }
  });

  return allLinks;
}

async function getCompanyLinks(page = 1, letra = "") {
  const cacheKey = `${letra}-${page}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  let url;
  if (letra) {
    url = page === 1 ? `${BASE_URL}?busca=${letra}` : `${BASE_URL}page/${page}/?busca=${letra}`;
  } else {
    url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
  }

  try {
    const res = await axiosInstance.get(url);
    const $ = cheerio.load(res.data);
    const links = [];

    $(".associados.flex-wrapper.three-itens a.associado.item").each((_, el) => {
      const href = $(el).attr("href");
      const name = $(el).find("h3").text().trim();
      if (href && name) {
        links.push({ name, url: href });
      }
    });

    cache.set(cacheKey, links);
    return links;
  } catch (err) {
    console.error(`❌ Erro página ${page} letra ${letra}: ${err.message}`);
    return [];
  }
}

async function getCompanyDetailsWithRetry(company, attempts = RETRY_ATTEMPTS) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await getCompanyDetails(company);
    } catch (err) {
      if (i === attempts - 1) {
        console.error(`❌ FALHA FINAL ${company.name}: ${err.message}`);
        return {
          nome: company.name,
          endereco: "ERRO AO EXTRAIR",
          cep: null,
          telefone: null,
        };
      }
      // Delay exponencial para retry
      await new Promise((resolve) => setTimeout(resolve, 200 * Math.pow(2, i)));
    }
  }
}

async function getCompanyDetails(company) {
  const cacheKey = `details-${company.url}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const res = await axiosInstance.get(company.url);
    const $ = cheerio.load(res.data);

    const name = $("h1").first().text().trim() || company.name || null;

    const enderecoCompleto =
      $(".et_pb_text_inner address").first().text().replace(/\s+/g, " ").trim() || null;

    let telefone = null;
    $(".et_pb_text_inner").each((_, el) => {
      const html = $(el).html();
      if (html && html.toLowerCase().includes("telefone")) {
        telefone =
          $(el)
            .text()
            .replace(/.*Telefone[:\s]/i, "")
            .trim() || null;
      }
    });

    let endereco = enderecoCompleto;
    let cep = null;
    if (enderecoCompleto) {
      const cepMatch = enderecoCompleto.match(/\d{5}-\d{3}/);
      if (cepMatch) {
        cep = cepMatch[0];
        endereco = enderecoCompleto.replace(cepMatch[0], "").trim();
      }
    }

    const result = {
      nome: name,
      endereco: endereco,
      cep: cep,
      telefone: telefone,
    };

    cache.set(cacheKey, result);
    return result;
  } catch (err) {
    throw new Error(`Erro ao buscar ${company.name}: ${err.message}`);
  }
}

// Processamento em batches paralelos
async function processBatch(companies, batchNumber) {
  console.log(`🔥 Processando batch ${batchNumber} com ${companies.length} empresas`);

  const promises = companies.map((company) => getCompanyDetailsWithRetry(company));
  const results = await Promise.allSettled(promises);

  const processedCompanies = [];
  let errors = 0;

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      processedCompanies.push(result.value);
    } else {
      errors++;
      processedCompanies.push({
        nome: companies[index].name,
        endereco: "ERRO CRÍTICO",
        cep: null,
        telefone: null,
      });
    }
  });

  console.log(`✅ Batch ${batchNumber}: ${processedCompanies.length} processadas, ${errors} erros`);
  return { companies: processedCompanies, errors };
}

// Descobrir automaticamente quantas páginas cada letra tem
async function discoverPagesForLetter(letra) {
  console.log(`🔍 Descobrindo páginas para letra ${letra.toUpperCase()}`);
  let page = 1;
  const maxPages = 20; // Limite de segurança
  const pagesToCheck = [];

  while (page <= maxPages) {
    const companies = await getCompanyLinks(page, letra);
    if (companies.length === 0) break;
    pagesToCheck.push(page);
    page++;
  }

  console.log(`📄 Letra ${letra.toUpperCase()}: ${pagesToCheck.length} páginas encontradas`);
  return pagesToCheck;
}

function createExcelFile(companies) {
  console.log(`📊 Gerando Excel com ${companies.length} empresas...`);

  const worksheetData = companies.map((company) => ({
    Nome: company.nome || "",
    Endereço: company.endereco || "",
    CEP: company.cep || "",
    Telefone: company.telefone || "",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);

  const columnWidths = [
    { wch: 30 }, // Nome
    { wch: 50 }, // Endereço
    { wch: 15 }, // CEP
    { wch: 20 }, // Telefone
  ];
  worksheet["!cols"] = columnWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas ACIT");

  const fileName = `empresas_acit_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  console.log(`📊 Arquivo Excel gerado: ${fileName}`);
  return fileName;
}

async function runToledoScraperTurbo() {
  console.log("🚀 MODO TURBO ATIVADO - PERFORMANCE MÁXIMA!");
  console.log(`💻 CPU Cores: ${os.cpus().length}`);
  console.log(`🔥 Requisições simultâneas: ${MAX_CONCURRENT_REQUESTS}`);
  console.log(`⚡ Timeout: ${TIMEOUT}ms`);

  const startTime = Date.now();
  let allCompanies = [];
  let totalErrors = 0;

  for (const letra of LETTERS) {
    console.log(`\n🏎️  PROCESSANDO LETRA: ${letra.toUpperCase()}`);

    try {
      // Descobrir todas as páginas da letra em paralelo
      const pages = await discoverPagesForLetter(letra);
      if (pages.length === 0) continue;

      // Buscar todas as empresas da letra em paralelo
      const allLinksForLetter = await getCompanyLinksParallel(pages, letra);

      if (allLinksForLetter.length === 0) continue;

      console.log(
        `📋 ${allLinksForLetter.length} empresas encontradas para letra ${letra.toUpperCase()}`
      );

      // Dividir em batches para processamento paralelo
      const batchSize = MAX_CONCURRENT_REQUESTS;
      const batches = [];
      for (let i = 0; i < allLinksForLetter.length; i += batchSize) {
        batches.push(allLinksForLetter.slice(i, i + batchSize));
      }

      console.log(`🔥 Processando ${batches.length} batches em paralelo`);

      // Processar todos os batches
      for (let i = 0; i < batches.length; i++) {
        const result = await processBatch(batches[i], i + 1);
        allCompanies.push(...result.companies);
        totalErrors += result.errors;

        // Mini delay entre batches para não sobrecarregar
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
    } catch (err) {
      console.error(`❌ Erro fatal na letra ${letra}: ${err.message}`);
    }
  }

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000 / 60).toFixed(2);

  console.log(`\n🏁 SCRAPING TURBO CONCLUÍDO!`);
  console.log(`⚡ Tempo total: ${totalTime} minutos`);
  console.log(`📊 Total: ${allCompanies.length} empresas`);
  console.log(`⚠️  Erros: ${totalErrors}`);
  console.log(`🏎️  Velocidade: ${(allCompanies.length / totalTime).toFixed(1)} empresas/minuto`);
  console.log(`💾 Cache hits: ${cache.size} entradas`);

  // Gerar arquivo Excel
  const fileName = createExcelFile(allCompanies);

  // Limpar cache para liberar memória
  cache.clear();

  return { companies: allCompanies, fileName, errors: totalErrors, timeMinutes: totalTime };
}

// Executar o scraper
if (require.main === module) {
  // Aumentar limite de listeners para evitar warnings
  process.setMaxListeners(0);

  // Garbage collection mais agressivo
  if (global.gc) {
    setInterval(() => {
      global.gc();
    }, 30000); // GC a cada 30 segundos
  }

  console.log(`🚀 INICIANDO SCRAPER TURBO no PID: ${process.pid}`);

  runToledoScraperTurbo()
    .then((result) => {
      console.log(`\n🏆 MISSÃO CUMPRIDA!`);
      console.log(`📊 ${result.companies.length} empresas processadas`);
      console.log(`⚠️  ${result.errors} erros`);
      console.log(`⏱️  ${result.timeMinutes} minutos`);
      console.log(`📁 Arquivo: ${result.fileName}`);
      console.log(
        `💻 Memória usada: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
      );
    })
    .catch((err) => {
      console.error("\n💥 ERRO CRÍTICO:", err.message);
      console.error(err.stack);
    })
    .finally(() => {
      process.exit(0);
    });
}

module.exports = runToledoScraperTurbo;
