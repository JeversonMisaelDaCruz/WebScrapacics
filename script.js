// Dependências necessárias: axios, cheerio, xlsx
// Instale com: npm install axios cheerio xlsx

const axios = require("axios");
const cheerio = require("cheerio");
const XLSX = require("xlsx");
const pLimit = require("p-limit").default; // CORRIGIDO: importa o default

const BASE_URL = "https://acit.org.br/associados/";
const CONCURRENCY = 5; // Ajuste conforme sua conexão e CPU

async function getCompanyLinks(page = 1) {
  const url = page === 1 ? BASE_URL : `${BASE_URL}page/${page}/`;
  for (let attempt = 1; attempt <= 3; attempt++) {
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
      console.error(`Erro ao buscar página ${page} (tentativa ${attempt}):`, err.message);
      if (attempt === 3) throw err;
      await new Promise((res) => setTimeout(res, 2000 * attempt)); // espera antes de tentar novamente
    }
  }
}

async function getCompanyDetails(company) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await axios.get(company.url);
      const $ = cheerio.load(res.data);
      const name = $("h1").first().text().trim() || company.name;
      const endereco = $(".et_pb_text_inner address").first().text().replace(/\s+/g, " ").trim();
      let telefone = "";
      $(".et_pb_text_inner").each((_, el) => {
        const html = $(el).html();
        if (html && html.toLowerCase().includes("telefone")) {
          telefone = $(el)
            .text()
            .replace(/.*Telefone[:\s]*/i, "")
            .trim();
        }
      });
      return { name, endereco, telefone };
    } catch (err) {
      console.error(`Erro ao buscar empresa ${company.name} (tentativa ${attempt}):`, err.message);
      if (attempt === 3)
        return { name: company.name, endereco: "", telefone: "", erro: err.message };
      await new Promise((res) => setTimeout(res, 2000 * attempt));
    }
  }
}

async function main() {
  let page = 1;
  let allCompanies = [];
  const limit = pLimit(CONCURRENCY);

  while (true) {
    let companies;
    try {
      companies = await getCompanyLinks(page);
    } catch (err) {
      console.error(`Falha definitiva na página ${page}. Encerrando.`);
      break;
    }
    if (companies.length === 0) break;

    const detailsPromises = companies.map((company) => limit(() => getCompanyDetails(company)));
    const detailsList = await Promise.all(detailsPromises);

    allCompanies.push(...detailsList);
    detailsList.forEach((details) => console.log(details));
    page++;
  }

  const worksheet = XLSX.utils.json_to_sheet(allCompanies);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
  XLSX.writeFile(workbook, "empresas.xlsx");
  console.log("Dados exportados para empresas.xlsx");
}

main();
