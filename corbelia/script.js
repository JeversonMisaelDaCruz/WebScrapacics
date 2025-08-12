// Antes de rodar este script, execute o comando abaixo no terminal para instalar as dependências:
// npm install axios cheerio xlsx

const axios = require("axios");
const cheerio = require("cheerio");
const xlsx = require("xlsx");

const BASE_URL = "https://www.acicorb.com.br";

async function getAssociadosLinks(html) {
  const $ = cheerio.load(html);
  const links = [];
  // Para cada tabela de cada categoria
  $(".panel-body table tr").each((_, tr) => {
    const nome = $(tr).find("td").first().text().trim();
    const linkTag = $(tr).find("a[href*='/associado/']");
    const href = linkTag.attr("href");
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

    // Nome
    const nome = empresa.nome;

    // Endereço
    let endereco = "";
    const enderecoDiv = $(".col-sm-7 .media.dados-associado .media-body").first();
    if (enderecoDiv.length) {
      endereco = enderecoDiv.html().replace(/<br>/g, " ").replace(/\s+/g, " ").trim();
    }

    // Telefones
    let telefones = [];
    $(".col-sm-7 .media.dados-associado").each((_, el) => {
      const icon = $(el).find(".media-left i.fa-phone");
      if (icon.length) {
        const telText = $(el).find(".media-body").text().replace(/\s+/g, " ").trim();
        // Pode ter mais de um telefone separado por <br>
        telefones = telText
          .split(/<br>|[\n\r]/)
          .map((t) => t.trim())
          .filter((t) => t);
      }
    });

    // E-mail
    let email = "";
    $(".col-sm-7 a[href^='mailto:']").each((_, el) => {
      const mail = $(el).find(".media-body").text().trim();
      if (mail) email = mail;
    });

    return {
      nome,
      endereco,
      telefones: telefones.join(", "),
      email,
      url: empresa.url,
    };
  } catch (err) {
    console.error("Erro ao buscar empresa:", empresa.nome, empresa.url, err.message);
    return {
      nome: empresa.nome,
      endereco: "",
      telefones: "",
      email: "",
      url: empresa.url,
      erro: err.message,
    };
  }
}

async function main() {
  const url = BASE_URL + "/associados";
  const res = await axios.get(url);
  const html = res.data;
  const associadosLinks = await getAssociadosLinks(html);

  const results = [];
  for (const empresa of associadosLinks) {
    const data = await getAssociadoData(empresa);
    results.push(data);
    console.log(data);
  }

  // Só exporta para XLSX depois de mapear todas as empresas
  const ws = xlsx.utils.json_to_sheet(results, {
    header: ["nome", "endereco", "telefones", "email", "url"],
  });
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Associados");
  xlsx.writeFile(wb, "associados_corbelia.xlsx");
  console.log("Planilha criada com", results.length, "empresas.");
}

main();
