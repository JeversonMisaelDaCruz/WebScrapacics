const axios = require("axios");
const cheerio = require("cheerio");
const chalk = require("chalk");

const BASE_URL = "https://acicvel.com.br/associados";

async function getCompanyData() {
  try {
    console.log(chalk.gray(`📄 Buscando dados da página: ${BASE_URL}`));
    const res = await axios.get(BASE_URL);
    const $ = cheerio.load(res.data);
    const companies = [];

    $("td.associado").each(function (i, elem) {
      const name = $(elem).find("h2").text().trim();
      const address = $(elem).find("p").text().trim();
      const rawPhone = $(elem)
        .find("span")
        .text()
        .trim()
        .replace("Contato - ", "")
        .replace(/[^0-9]/g, "");

      if (name && rawPhone) {
        companies.push({
          nome: name,
          endereco: address,
          telefone: rawPhone,
          cidade: "",
        });
        console.log(chalk.green(`  ✓ ${name} - Dados coletados`));
      }
    });

    console.log(chalk.blue(`✓ Encontradas ${companies.length} empresas com telefone`));
    return companies;
  } catch (err) {
    console.error(chalk.red(`❌ Erro ao buscar dados: ${err.message}`));
    return [];
  }
}

async function runCascavelScraper() {
  console.log(chalk.cyan.bold("🚀 Iniciando web scraping da ACIC Cascavel..."));
  console.log(chalk.gray("═".repeat(50)));

  const companies = await getCompanyData();

  if (companies.length > 0) {
    companies.sort((a, b) => a.nome.localeCompare(b.nome));
    console.log(chalk.green(`📊 ${companies.length} empresas processadas e ordenadas`));
  }

  console.log(chalk.gray("═".repeat(50)));
  console.log(chalk.green.bold(`✅ Scraping da ACIC Cascavel concluído!`));
  console.log(
    chalk.white(`📊 Total de empresas processadas: ${chalk.bold.green(companies.length)}`)
  );
  console.log(chalk.gray("═".repeat(50)));

  return companies;
}

module.exports = runCascavelScraper;
