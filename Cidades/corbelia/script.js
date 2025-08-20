const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.acicorb.com.br";

async function getAssociadosLinks(html) {
  const $ = cheerio.load(html);
  const links = [];
  $(".panel-body table tr").each((_, tr) => {
    const nome = $(tr).find("td").first().text().trim() || null;
    const linkTag = $(tr).find("a[href*='/associado/']");
    const href = linkTag.attr("href") || null;
    if (nome && href) {
      links.push({ nome, url: href.startsWith("http") ? href : BASE_URL + href });
    }
  });
  return links;
}

async function getAssociadoData(empresa) {
  try {
    const res = await axios.get(empresa.url);
    const $ = cheerio.load(res.data);

    let enderecoCompleto = null;
    const enderecoDiv = $(".col-sm-7 .media.dados-associado .media-body").first();
    if (enderecoDiv.length) {
      enderecoCompleto =
        enderecoDiv.html().replace(/<br>/g, " ").replace(/\s+/g, " ").trim() || null;
    }

    let telefones = null;
    $(".col-sm-7 .media.dados-associado").each((_, el) => {
      const icon = $(el).find(".media-left i.fa-phone");
      if (icon.length) {
        const telText = $(el).find(".media-body").text().replace(/\s+/g, " ").trim();
        telefones =
          telText
            .split(/<br>|[\n\r]/)
            .map((t) => t.trim())
            .filter((t) => t)
            .join(", ") || null;
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

    return {
      nome: empresa.nome,
      endereco,
      cep,
      telefone: telefones,
      cidade: "Corbelia",
    };
  } catch (err) {
    console.error(`Erro ao buscar empresa ${empresa.nome}: ${err.message}`);
    return {
      nome: empresa.nome,
      endereco: null,
      cep: null,
      telefone: null,
    };
  }
}

async function runCorbeliaScraper() {
  console.log("🚀 Iniciando web scraping da ACICORB...");
  const url = BASE_URL + "/associados";
  try {
    const res = await axios.get(url);
    const html = res.data;
    const associadosLinks = await getAssociadosLinks(html);
    const results = [];
    for (const empresa of associadosLinks) {
      const data = await getAssociadoData(empresa);
      results.push(data);
    }
    console.log(`✅ Scraping da ACICORB concluído! ${results.length} empresas encontradas.`);
    return results;
  } catch (err) {
    console.error(`❌ Erro fatal no scraping da ACICORB: ${err.message}`);
    return [];
  }
}

module.exports = runCorbeliaScraper;
