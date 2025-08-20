const axios = require("axios");
const cheerio = require("cheerio");

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
    return links;
  } catch (err) {
    console.error(`Erro ao buscar página ${page} da letra ${letra}: ${err.message}`);
    return [];
  }
}

async function getCompanyDetails(company) {
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

    let endereco = enderecoCompleto;
    let cep = null;

    if (enderecoCompleto) {
      const cepMatch = enderecoCompleto.match(/\d{5}-\d{3}/);
      if (cepMatch) {
        cep = cepMatch[0];
        endereco = enderecoCompleto.replace(cepMatch[0], "").trim();
      }
    }

    return { nome: name, endereco, cep, telefone, cidade: "Toledo" };
  } catch (err) {
    console.error(`Erro ao buscar empresa ${company.name}: ${err.message}`);
    return { nome: company.name, endereco: null, cep: null, telefone: null };
  }
}

async function runToledoScraper() {
  console.log("🚀 Iniciando web scraping da ACIT...");
  let allCompanies = [];
  for (const letra of LETTERS) {
    let page = 1;
    console.log(`Processando letra: ${letra.toUpperCase()}`);
    while (true) {
      const companies = await getCompanyLinks(page, letra);
      if (companies.length === 0) break;
      for (const company of companies) {
        const details = await getCompanyDetails(company);
        allCompanies.push(details);
      }
      page++;
    }
  }
  console.log(`✅ Scraping da ACIT concluído! ${allCompanies.length} empresas encontradas.`);
  return allCompanies;
}

module.exports = runToledoScraper;
