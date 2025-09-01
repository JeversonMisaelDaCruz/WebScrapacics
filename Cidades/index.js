// Polyfill para ReadableStream (necessário para alguns scrapers)
if (!global.ReadableStream) {
  const {
    ReadableStream,
    WritableStream,
    TransformStream,
  } = require("web-streams-polyfill/ponyfill");
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
  global.TransformStream = TransformStream;
}

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

function safeRequire(modulePath) {
  try {
    const possiblePaths = [
      path.resolve(__dirname, modulePath + ".js"),
      path.resolve(__dirname, modulePath + "/index.js"),
      path.resolve(__dirname, modulePath),
    ];

    for (const fullPath of possiblePaths) {
      if (fs.existsSync(fullPath)) {
        console.log(`✅ Carregando módulo: ${modulePath} de ${fullPath}`);
        return require(modulePath);
      }
    }
    console.warn(`⚠️  Módulo não encontrado: ${modulePath}`);
    console.warn(`   Caminhos verificados:`);
    possiblePaths.forEach((p) => console.warn(`   - ${p}`));
    return null;
  } catch (error) {
    console.warn(`⚠️  Erro ao carregar módulo ${modulePath}: ${error.message}`);
    return null;
  }
}

console.log("Verificando scrapers disponíveis...\n");
const runCapitaoScraper = safeRequire("./capitao/scraper-acicap");
const runCorbeliaScraper = safeRequire("./corbelia/script");
const runCascavelScraper = safeRequire("./cascavel/script");
const runMarechalScraper = safeRequire("./marechal/scraper-acimacar");
const runMedianeiraScraper = safeRequire("./medianeira/scraper");
const SantaHelenaModule = safeRequire("./santaHelena/script");
const ToledoModule = safeRequire("./toledo/script");
const runCafelandiaScraper = safeRequire("./cafelandia/script");
const runNovaAuroraScraper = safeRequire("./novaaurora/script");
const runCeuAzulScraper = safeRequire("./ceuAzul/script");
const runAcicLindoOesteScraper = safeRequire("./lindoOeste/script");

const AVAILABLE_CITIES = {};

if (runCapitaoScraper) {
  AVAILABLE_CITIES.capitao = { name: "ACICAP (Capitão)", scraper: runCapitaoScraper };
  console.log(" Capitão carregado");
}
if (runCorbeliaScraper) {
  AVAILABLE_CITIES.corbelia = { name: "ACICORB (Corbélia)", scraper: runCorbeliaScraper };
  console.log(" Corbélia carregado");
}
if (runCascavelScraper) {
  AVAILABLE_CITIES.cascavel = { name: "ACIC (Cascavel)", scraper: runCascavelScraper };
  console.log(" Cascavel carregado");
}
if (runMarechalScraper) {
  AVAILABLE_CITIES.marechal = { name: "ACIMACAR (Marechal)", scraper: runMarechalScraper };
  console.log(" Marechal carregado");
}
if (runMedianeiraScraper) {
  AVAILABLE_CITIES.medianeira = { name: "ACIME (Medianeira)", scraper: runMedianeiraScraper };
  console.log(" Medianeira carregado");
}
if (SantaHelenaModule) {
  AVAILABLE_CITIES.santahelena = { name: "ACISASH (Santa Helena)", scraper: SantaHelenaModule };
  console.log(" Santa Helena carregado");
}
if (ToledoModule) {
  AVAILABLE_CITIES.toledo = { name: "ACIT (Toledo)", scraper: ToledoModule };
  console.log(" Toledo carregado");
}
if (runCafelandiaScraper) {
  AVAILABLE_CITIES.cafelandia = { name: "ACICAF (Cafelândia)", scraper: runCafelandiaScraper };
  console.log(" Cafelândia carregado");
}
if (runNovaAuroraScraper) {
  AVAILABLE_CITIES.novaaurora = { name: "ACINA (Nova Aurora)", scraper: runNovaAuroraScraper };
  console.log(" Nova Aurora carregado");
}
if (runCeuAzulScraper) {
  AVAILABLE_CITIES.ceuazul = { name: "ACINA (Ceu Azul)", scraper: runCeuAzulScraper };
  console.log(" Ceu Azul carregado");
}
if (runAcicLindoOesteScraper) {
  AVAILABLE_CITIES.lindooeste = { name: "ACICLO (Lindo Oeste)", scraper: runAcicLindoOesteScraper };
  console.log("✅ Lindo Oeste carregado");
}

console.log(`\n🔍 Cidades disponíveis: ${Object.keys(AVAILABLE_CITIES).join(", ")}`);
function checkDirectoryStructure() {
  console.log("\n📁 Verificando estrutura de diretórios:");
  const expectedDirs = [
    "./santaHelena",
    "./lindoOeste",
    "./capitao",
    "./corbelia",
    "./cascavel",
    "./marechal",
    "./medianeira",
    "./santaHelena",
    "./toledo",
    "./cafelandia",
    "./novaaurora",
    "./ceuAzul",
  ];

  expectedDirs.forEach((dir) => {
    const fullPath = path.resolve(__dirname, dir);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${dir} existe`);
      try {
        const files = fs.readdirSync(fullPath);
        console.log(`   Arquivos: ${files.join(", ")}`);
      } catch (error) {
        console.log(` Erro ao ler diretório: ${error.message}`);
      }
    } else {
      console.log(`❌ ${dir} não existe`);
    }
  });
}

async function runScrapers(selectedCities = null) {
  const citiesToRun = selectedCities || Object.keys(AVAILABLE_CITIES);

  console.log("\n==========================================");
  if (selectedCities) {
    console.log(
      `🚀 INICIANDO WEBSCRAP PARA: ${citiesToRun
        .map((city) => AVAILABLE_CITIES[city]?.name || city)
        .join(", ")}`
    );
  } else {
    console.log(" INICIANDO O PROCESSO DE WEBSCRAP COMPLETO");
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
        console.log(`\n🔄 Executando scraper para ${name}...`);

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
        console.error(`   Stack: ${error.stack}`);
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
}

function saveDataToFile(data) {
  try {
    const now = new Date();
    const timestamp = now.toISOString().split("T")[0];

    const resultsDir = "../results";
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
      { wch: 20 }, // Cidade
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

  if (args.includes("--check")) {
    checkDirectoryStructure();
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
