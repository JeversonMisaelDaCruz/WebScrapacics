const axios = require("axios");
const cheerio = require("cheerio");
const chalk = require("chalk");

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

async function getCompanyLinks(page = 1, letra = "") {
  let url;
  if (letra) {
    url = page === 1 ? `${BASE_URL}?busca=${letra}` : `${BASE_URL}page/${page}/?busca=${letra}`;
  } else {
    url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
  }
  try {
    console.log(chalk.gray(`    📄 Buscando página ${page} da letra ${letra.toUpperCase()}...`));
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);
    const links = [];
    $(".associados.flex-wrapper.three-itens a.associado.item").each((_, el) => {
      const href = $(el).attr("href");
      const name = $(el).find("h3").text().trim();
      if (href && name) {
        links.push({ name, url: href });
      }
    });
    if (links.length > 0) {
      console.log(chalk.blue(`    ✓ Encontradas ${links.length} empresas na página ${page}`));
    }
    return links;
  } catch (err) {
    console.error(chalk.red(`    ❌ Erro ao buscar página ${page} da letra ${letra}: ${err.message}`));
    return [];
  }
}

async function getCompanyDetails(company, currentIndex, totalCompanies) {
  try {
    const res = await axios.get(company.url);
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
            .replace(/.*Telefone[:\s]*/i, "")
            .trim() || null;
      }
    });

    let endereco = enderecoCompleto.split(' CEP:')[0];
    let cidade = ((enderecoCompleto.split(' CEP:')[1] || '–').split('–')[1] || '').trim().split('/')[0].trim();
    let cep = null;

    if (enderecoCompleto) {
      const cepMatch = enderecoCompleto.match(/\d{5}-\d{3}/);
      if (cepMatch) {
        cep = cepMatch[0];
      }
    }

    const progress = ((currentIndex / totalCompanies) * 100).toFixed(1);
    console.log(chalk.green(`      ✓ [${progress}%] ${name} - Dados coletados`));

    return { nome: name, endereco, cep, telefone, cidade: cidade };
  } catch (err) {
    console.error(chalk.red(`      ❌ Erro ao buscar empresa ${company.name}: ${err.message}`));
    return { nome: company.name, endereco: null, cep: null, telefone: null, cidade: "Toledo" };
  }
}

async function runToledoScraper() {
  console.log(chalk.cyan.bold("🚀 Iniciando web scraping da ACIT Toledo..."));
  console.log(chalk.gray("═".repeat(50)));
  
  let allCompanies = [];
  let allCompanyLinks = [];
  
  // Primeira fase: Coletar todos os links
  console.log(chalk.yellow("📋 Fase 1: Coletando links das empresas..."));
  
  for (let i = 0; i < LETTERS.length; i++) {
    const letra = LETTERS[i];
    let page = 1;
    const letraProgress = ((i / LETTERS.length) * 100).toFixed(1);
    console.log(chalk.magenta(`\n  🔤 [${letraProgress}%] Processando letra: ${letra.toUpperCase()}`));
    
    while (true) {
      const companies = await getCompanyLinks(page, letra);
      if (companies.length === 0) break;
      allCompanyLinks.push(...companies);
      page++;
    }
    
    console.log(chalk.blue(`    ✓ Letra ${letra.toUpperCase()} concluída. Total de links coletados: ${allCompanyLinks.length}`));
  }
  
  console.log(chalk.green(`\n✅ Fase 1 concluída! ${allCompanyLinks.length} links de empresas coletados.`));
  console.log(chalk.gray("═".repeat(50)));
  
  // Segunda fase: Coletar detalhes das empresas
  console.log(chalk.yellow("📊 Fase 2: Coletando detalhes das empresas..."));
  
  for (let i = 0; i < allCompanyLinks.length; i++) {
    const company = allCompanyLinks[i];
    const details = await getCompanyDetails(company, i + 1, allCompanyLinks.length);
    allCompanies.push(details);
    
    // Log de progresso a cada 10 empresas
    if ((i + 1) % 10 === 0 || i === allCompanyLinks.length - 1) {
      const progress = (((i + 1) / allCompanyLinks.length) * 100).toFixed(1);
      console.log(chalk.cyan(`    📈 Progresso geral: ${i + 1}/${allCompanyLinks.length} empresas (${progress}%)\n`));
    }
  }
  
  console.log(chalk.gray("═".repeat(50)));
  console.log(chalk.green.bold(`✅ Scraping da ACIT Toledo concluído!`));
  console.log(chalk.white(`📊 Total de empresas processadas: ${chalk.bold.green(allCompanies.length)}`));
  console.log(chalk.gray("═".repeat(50)));
  
  return allCompanies;
}

module.exports = runToledoScraper;
