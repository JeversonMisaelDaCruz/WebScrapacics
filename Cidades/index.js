const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

function safeRequire(modulePath) {
  try {
    const fullPath = path.resolve(__dirname, modulePath);
    if (fs.existsSync(fullPath + ".js") || fs.existsSync(fullPath)) {
      return require(modulePath);
    }
    return null;
  } catch (error) {
    console.warn(`⚠️  Não foi possível carregar o módulo: ${modulePath}`);
    return null;
  }
}

const runCapitaoScraper = safeRequire("./capitao/scraper-acicap");
const runCorbeliaScraper = safeRequire("./corbelia/script");
const runCascavelScraper = safeRequire("./cascavel/script");
const runMarechalScraper = safeRequire("./marechal/scraper-acimacar");
const runMedianeiraScraper = safeRequire("./medianeira/scraper");
const SantaHelenaModule = safeRequire("./santaHelena/script");
const ToledoModule = safeRequire("./toledo/script");

const AVAILABLE_CITIES = {};

if (runCapitaoScraper) {
  AVAILABLE_CITIES.capitao = { name: "ACICAP (Capitão)", scraper: runCapitaoScraper };
}
if (runCorbeliaScraper) {
  AVAILABLE_CITIES.corbelia = { name: "ACICORB (Corbélia)", scraper: runCorbeliaScraper };
}
if (runCascavelScraper) {
  AVAILABLE_CITIES.cascavel = { name: "ACIC (Cascavel)", scraper: runCascavelScraper };
}
if (runMarechalScraper) {
  AVAILABLE_CITIES.marechal = { name: "ACIMACAR (Marechal)", scraper: runMarechalScraper };
}
if (runMedianeiraScraper) {
  AVAILABLE_CITIES.medianeira = { name: "ACIME (Medianeira)", scraper: runMedianeiraScraper };
}
if (SantaHelenaModule) {
  AVAILABLE_CITIES.santahelena = { name: "ACISASH (Santa Helena)", scraper: SantaHelenaModule };
}
if (ToledoModule) {
  AVAILABLE_CITIES.toledo = { name: "ACIT (Toledo)", scraper: ToledoModule };
}

console.log(`🔍 Cidades carregadas: ${Object.keys(AVAILABLE_CITIES).join(", ")}`);

async function runScrapers(selectedCities = null) {
  const citiesToRun = selectedCities || Object.keys(AVAILABLE_CITIES);

  console.log("==========================================");
  if (selectedCities) {
    console.log(
      `🚀 INICIANDO WEBSCRAP PARA: ${citiesToRun
        .map((city) => AVAILABLE_CITIES[city]?.name || city)
        .join(", ")}`
    );
  } else {
    console.log("🚀 INICIANDO O PROCESSO DE WEBSCRAP COMPLETO");
  }
  console.log("==========================================");

  let allCompanies = [];
  const scraperPromises = [];
  for (const cityKey of citiesToRun) {
    if (!AVAILABLE_CITIES[cityKey]) {
      console.error(
        `\n❌ Cidade '${cityKey}' não encontrada. Cidades disponíveis: ${Object.keys(
          AVAILABLE_CITIES
        ).join(", ")}`
      );
      continue;
    }

    const { name, scraper } = AVAILABLE_CITIES[cityKey];

    const scraperPromise = (async () => {
      try {
        let data;
        if (cityKey === "santahelena") {
          const scraperInstance = new scraper();
          data = await scraperInstance.run();
        } else {
          data = await scraper();
        }

        console.log(`\n🎉 ${name} concluído. Total: ${data.length} empresas.`);
        console.log("------------------------------------------");
        return data;
      } catch (error) {
        console.error(`\n❌ Erro ao executar o scraper de ${name}:`, error.message);
        console.log("------------------------------------------");
        return [];
      }
    })();

    scraperPromises.push(scraperPromise);
  }

  // Aguarda todos os scrapers terminarem
  const results = await Promise.all(scraperPromises);

  // Consolida todos os resultados
  for (const data of results) {
    allCompanies.push(...data);
  }

  // Ajustado para incluir o campo 'cidade'
  const filteredCompanies = allCompanies.map((empresa) => ({
    nome: empresa.nome || null,
    telefone: empresa.telefone || null,
    endereco: empresa.endereco || null,
    cep: empresa.cep || null,
    cidade: empresa.cidade || null,
  }));

  console.log(`\n✅ PROCESSO FINALIZADO! Total de empresas coletadas: ${filteredCompanies.length}`);

  if (filteredCompanies.length > 0) {
    saveDataToFile(filteredCompanies);
  } else {
    console.log("\n⚠️ Nenhuma empresa coletada. Nenhum arquivo será gerado.");
  }
}

async function runAllScrapers() {
  return await runScrapers();
}

function showHelp() {
  console.log("\n📋 USO DO SCRIPT:");
  console.log("node index.js [cidades...]");
  console.log("\n🏙️ CIDADES DISPONÍVEIS:");
  Object.keys(AVAILABLE_CITIES).forEach((key) => {
    console.log(`  - ${key}: ${AVAILABLE_CITIES[key].name}`);
  });
  console.log("\n📝 EXEMPLOS:");
  console.log("  node index.js                    # Executa todas as cidades");
  console.log("  node index.js toledo             # Executa apenas Toledo");
  console.log("  node index.js toledo capitao     # Executa Toledo e Capitão");
  console.log("  node index.js --help             # Mostra esta ajuda");
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
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  if (args.length === 0) {
    runAllScrapers().catch((error) => {
      console.error("❌ Erro fatal no processo principal:", error.message);
      process.exit(1);
    });
  } else {
    const selectedCities = args.map((city) => city.toLowerCase());
    runScrapers(selectedCities).catch((error) => {
      console.error("❌ Erro fatal no processo principal:", error.message);
      process.exit(1);
    });
  }
}

module.exports = { runAllScrapers, runScrapers, saveDataToFile, AVAILABLE_CITIES };
