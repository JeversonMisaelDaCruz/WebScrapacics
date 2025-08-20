const XLSX = require("xlsx");
const fs = require("fs");

const runCapitaoScraper = require("./capitao/scraper-acicap");
const runCorbeliaScraper = require("./corbelia/script");
const runMarechalScraper = require("./marechal/scraper-acimacar");
const SantaHelenaModule = require("./santaHelena/script");
const ToledoModule = require("./toledo/script");

async function runAllScrapers() {
  console.log("==========================================");
  console.log("🚀 INICIANDO O PROCESSO DE WEBSCRAP COMPLETO");
  console.log("==========================================");

  let allCompanies = [];

  try {
    const capitaoData = await runCapitaoScraper();
    allCompanies.push(...capitaoData);
    console.log(`\n🎉 ACICAP (Capitão) concluído. Total: ${capitaoData.length} empresas.`);
    console.log("------------------------------------------");
  } catch (error) {
    console.error("\n❌ Erro ao executar o scraper de Capitão:", error.message);
    console.log("------------------------------------------");
  }

  try {
    const corbeliaData = await runCorbeliaScraper();
    allCompanies.push(...corbeliaData);
    console.log(`\n🎉 ACICORB (Corbélia) concluído. Total: ${corbeliaData.length} empresas.`);
    console.log("------------------------------------------");
  } catch (error) {
    console.error("\n❌ Erro ao executar o scraper de Corbélia:", error.message);
    console.log("------------------------------------------");
  }

  try {
    const marechalData = await runMarechalScraper();
    allCompanies.push(...marechalData);
    console.log(`\n🎉 ACIMACAR (Marechal) concluído. Total: ${marechalData.length} empresas.`);
    console.log("------------------------------------------");
  } catch (error) {
    console.error("\n❌ Erro ao executar o scraper de Marechal:", error.message);
    console.log("------------------------------------------");
  }

  try {
    const santaHelenaScraper = new SantaHelenaModule();
    const santaHelenaData = await santaHelenaScraper.run();
    allCompanies.push(...santaHelenaData);
    console.log(
      `\n🎉 ACISASH (Santa Helena) concluído. Total: ${santaHelenaData.length} empresas.`
    );
    console.log("------------------------------------------");
  } catch (error) {
    console.error("\n❌ Erro ao executar o scraper de Santa Helena:", error.message);
    console.log("------------------------------------------");
  }

  try {
    const toledoData = await ToledoModule();
    allCompanies.push(...toledoData);
    console.log(`\n🎉 ACIT (Toledo) concluído. Total: ${toledoData.length} empresas.`);
    console.log("------------------------------------------");
  } catch (error) {
    console.error("\n❌ Erro ao executar o scraper de Toledo:", error.message);
    console.log("------------------------------------------");
  }

  // Ajustado para incluir o campo 'cidade'
  const filteredCompanies = allCompanies.map((empresa) => ({
    nome: empresa.nome || null,
    telefone: empresa.telefone || null,
    endereco: empresa.endereco || null,
    cep: empresa.cep || null,
    cidade: empresa.cidade || null, // ✅ CAMPO CIDADE ADICIONADO
  }));

  console.log(`\n✅ PROCESSO FINALIZADO! Total de empresas coletadas: ${filteredCompanies.length}`);

  if (filteredCompanies.length > 0) {
    saveDataToFile(filteredCompanies);
  } else {
    console.log("\n⚠️ Nenhuma empresa coletada. Nenhum arquivo será gerado.");
  }
}

function saveDataToFile(data) {
  try {
    const now = new Date();
    const timestamp = now.toISOString().split("T")[0];

    const resultsDir = "./resultados";
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir);
    }

    const jsonFileName = `${resultsDir}/empresas_consolidado_${timestamp}.json`;
    fs.writeFileSync(jsonFileName, JSON.stringify(data, null, 2));
    console.log(`\n💾 Dados salvos em JSON: ${jsonFileName}`);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    // ✅ AJUSTADO: Largura para 5 colunas (incluindo cidade)
    const columnWidths = [
      { wch: 30 }, // Nome
      { wch: 20 }, // Telefone
      { wch: 50 }, // Endereço
      { wch: 15 }, // CEP
      { wch: 20 }, // Cidade ✅ NOVA COLUNA
    ];

    worksheet["!cols"] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");

    const xlsxFileName = `${resultsDir}/empresas_consolidado_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, xlsxFileName);
    console.log(`📊 Planilha salva: ${xlsxFileName}`);
    console.log(`📋 Colunas: Nome | Telefone | Endereço | CEP | Cidade`);
  } catch (error) {
    console.error("❌ Erro ao salvar os arquivos:", error.message);
  }
}

if (require.main === module) {
  runAllScrapers().catch((error) => {
    console.error("❌ Erro fatal no processo principal:", error.message);
    process.exit(1);
  });
}

module.exports = { runAllScrapers, saveDataToFile };
