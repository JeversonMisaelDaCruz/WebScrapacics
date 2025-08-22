const XLSX = require("xlsx");
const fs = require("fs");

const runCapitaoScraper = require("./capitao/scraper-acicap");
const runCorbeliaScraper = require("./corbelia/script");
const runMarechalScraper = require("./marechal/scraper-acimacar");
const SantaHelenaModule = require("./santaHelena/script");
const ToledoModule = require("./toledo/script");

// Mapeamento das cidades disponíveis
const AVAILABLE_CITIES = {
  capitao: { name: "ACICAP (Capitão)", scraper: runCapitaoScraper },
  corbelia: { name: "ACICORB (Corbélia)", scraper: runCorbeliaScraper },
  marechal: { name: "ACIMACAR (Marechal)", scraper: runMarechalScraper },
  santahelena: { name: "ACISASH (Santa Helena)", scraper: SantaHelenaModule },
  toledo: { name: "ACIT (Toledo)", scraper: ToledoModule }
};

async function runScrapers(selectedCities = null) {
  const citiesToRun = selectedCities || Object.keys(AVAILABLE_CITIES);
  
  console.log("==========================================");
  if (selectedCities) {
    console.log(`🚀 INICIANDO WEBSCRAP PARA: ${citiesToRun.map(city => AVAILABLE_CITIES[city]?.name || city).join(", ")}`);
  } else {
    console.log("🚀 INICIANDO O PROCESSO DE WEBSCRAP COMPLETO");
  }
  console.log("==========================================");

  let allCompanies = [];
  const scraperPromises = [];

  // Executa todos os scrapers selecionados em paralelo
  for (const cityKey of citiesToRun) {
    if (!AVAILABLE_CITIES[cityKey]) {
      console.error(`\n❌ Cidade '${cityKey}' não encontrada. Cidades disponíveis: ${Object.keys(AVAILABLE_CITIES).join(", ")}`);
      continue;
    }

    const { name, scraper } = AVAILABLE_CITIES[cityKey];
    
    const scraperPromise = (async () => {
      try {
        let data;
        if (cityKey === 'santahelena') {
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
    cidade: empresa.cidade || null, // ✅ CAMPO CIDADE ADICIONADO
  }));

  console.log(`\n✅ PROCESSO FINALIZADO! Total de empresas coletadas: ${filteredCompanies.length}`);

  if (filteredCompanies.length > 0) {
    saveDataToFile(filteredCompanies);
  } else {
    console.log("\n⚠️ Nenhuma empresa coletada. Nenhum arquivo será gerado.");
  }
}

// Função para manter compatibilidade
async function runAllScrapers() {
  return await runScrapers();
}

// Função para mostrar ajuda
function showHelp() {
  console.log("\n📋 USO DO SCRIPT:");
  console.log("node index.js [cidades...]");
  console.log("\n🏙️ CIDADES DISPONÍVEIS:");
  Object.keys(AVAILABLE_CITIES).forEach(key => {
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
  const args = process.argv.slice(2);
  
  // Verifica se é pedido de ajuda
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  // Se não há argumentos, executa todas as cidades
  if (args.length === 0) {
    runAllScrapers().catch((error) => {
      console.error("❌ Erro fatal no processo principal:", error.message);
      process.exit(1);
    });
  } else {
    // Executa apenas as cidades especificadas
    const selectedCities = args.map(city => city.toLowerCase());
    runScrapers(selectedCities).catch((error) => {
      console.error("❌ Erro fatal no processo principal:", error.message);
      process.exit(1);
    });
  }
}

module.exports = { runAllScrapers, runScrapers, saveDataToFile, AVAILABLE_CITIES };
