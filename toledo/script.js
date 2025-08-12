
const axios = require("axios");
const cheerio = require("cheerio");
const XLSX = require("xlsx");

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
    console.error(`Erro ao buscar empresa ${company.name}: ${err.message}`);
    return { name: company.name, endereco: "", telefone: "", erro: err.message };
  }
}

async function main() {
  let allCompanies = [];
  for (const letra of LETTERS) {
    let page = 1;
    console.log(`Processando letra: ${letra.toUpperCase()}`);
    while (true) {
      console.log(`  Página: ${page}`);
      const companies = await getCompanyLinks(page, letra);
      if (companies.length === 0) break;
      for (const company of companies) {
        const details = await getCompanyDetails(company);

        allCompanies.push({
          Nome: details.name || "",
          Endereco: details.endereco || "",
          Telefone: details.telefone || "",
        });
        console.log(details);
      }
      page++;
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(allCompanies, {
    header: ["Nome", "Endereco", "Telefone"],
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
  XLSX.writeFile(workbook, "empresas.xlsx");
  console.log("Dados exportados para empresas.xlsx");
}

main();
