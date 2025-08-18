const axios = require("axios");
const cheerio = require("cheerio");
const XLSX = require("xlsx");
const fs = require("fs");

class AcisashScraper {
  constructor() {
    this.empresas = [];
    this.baseUrl = "https://acisash.com.br/associados/";
    this.detalhesColetados = 0;
    this.errosDetalhes = 0;
    this.axiosConfig = {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    };
  }

  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping da ACISASH com Cheerio...");

    try {
      console.log("🌐 Acessando página principal...");
      const response = await axios.get(this.baseUrl, this.axiosConfig);
      const $ = cheerio.load(response.data);

      const categorias = this.encontrarCategorias($);
      console.log(`📋 Encontradas ${categorias.length} categorias`);

      for (let i = 0; i < categorias.length; i++) {
        const categoria = categorias[i];
        console.log(`\n📂 Processando categoria ${i + 1}/${categorias.length}: ${categoria.nome}`);

        await this.processarCategoria(categoria);
        await this.delay(1000); 
      }

      console.log(`\n✅ Scraping concluído!`);
      console.log(`📊 Total de empresas processadas: ${this.empresas.length}`);
      console.log(`✅ Detalhes coletados com sucesso: ${this.detalhesColetados}`);
      console.log(`❌ Erros ao coletar detalhes: ${this.errosDetalhes}`);

      await this.salvarPlanilha();
    } catch (error) {
      console.error("❌ Erro fatal durante o scraping:", error.message);
    }
  }

  encontrarCategorias($) {
    const categorias = [];

    $(".categoria-item").each((index, element) => {
      const $element = $(element);
      const href = $element.attr("href");
      const nome = $element.find("p").text().trim();

      if (href && nome) {
        categorias.push({ index, nome, href });
        console.log(`  📁 Categoria encontrada: ${nome}`);
      }
    });

    return categorias;
  }

  async processarCategoria(categoria) {
    try {
      console.log(`  🔗 Acessando: ${categoria.href}`);

      const response = await axios.get(categoria.href, this.axiosConfig);
      const $ = cheerio.load(response.data);

      const empresasCategoria = [];

      $(".associado-item").each((index, element) => {
        try {
          const $element = $(element);
          const $infos = $element.find(".associado-infos");

          if ($infos.length === 0) return;


          let nome = $infos.find("h3").text().trim() || "Não informado";


          let endereco = "Não informado";
          let telefone = "Não informado";

          $infos.find("p").each((pIndex, pElement) => {
            const texto = $(pElement).text().trim();

            if (texto.toLowerCase().includes("telefone:")) {
              telefone = texto.replace(/telefone:\s*/i, "").trim();
            } else if (texto.length > 10 && !texto.toLowerCase().includes("telefone:")) {

              endereco = texto;
            }
          });

          if (nome !== "Não informado") {
            empresasCategoria.push({
              nome,
              endereco,
              telefone,
              categoria: categoria.nome,
            });
          }
        } catch (error) {
          console.error(`    ❌ Erro ao processar empresa individual:`, error.message);
        }
      });

      if (empresasCategoria.length > 0) {
        console.log(`  📦 Encontradas ${empresasCategoria.length} empresas na categoria`);

        empresasCategoria.forEach((empresa, index) => {
          console.log(`    ✅ Empresa ${index + 1}: ${empresa.nome}`);
          this.empresas.push({
            ...empresa,
            dataColeta: new Date().toISOString(),
          });
        });

        this.detalhesColetados += empresasCategoria.length;
      } else {
        console.log(`  ℹ️ Nenhuma empresa encontrada na categoria "${categoria.nome}".`);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar categoria ${categoria.nome}:`, error.message);
      this.errosDetalhes++;


      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  URL: ${categoria.href}`);
      }
    }
  }

  async salvarPlanilha() {
    try {
      if (this.empresas.length === 0) {
        console.log("\n❌ Nenhuma empresa foi coletada. O arquivo não será gerado.");
        return;
      }

      const dadosParaPlanilha = this.empresas.map((empresa, index) => ({
        ID: index + 1,
        "Nome da Empresa": empresa.nome || "Não informado",
        Categoria: empresa.categoria || "Não informado",
        Endereço: empresa.endereco || "Não informado",
        Telefone: empresa.telefone || "Não informado",
        "Data Coleta": new Date(empresa.dataColeta).toLocaleDateString("pt-BR"),
        "Hora Coleta": new Date(empresa.dataColeta).toLocaleTimeString("pt-BR"),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(dadosParaPlanilha);


      worksheet["!cols"] = [
        { wch: 5 }, // ID
        { wch: 40 }, // Nome da Empresa
        { wch: 35 }, // Categoria
        { wch: 60 }, // Endereço
        { wch: 20 }, // Telefone
        { wch: 12 }, // Data Coleta
        { wch: 10 }, // Hora Coleta
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas ACISASH");

      const timestamp = new Date().toISOString().split("T")[0];
      const nomeArquivo = `acisash_empresas_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);

      console.log(`\n💾 Planilha salva com sucesso como: ${nomeArquivo}`);

      // Backup em JSON
      const nomeJson = `acisash_empresas_${timestamp}.json`;
      fs.writeFileSync(nomeJson, JSON.stringify(this.empresas, null, 2), "utf8");
      console.log(`💾 Backup JSON salvo como: ${nomeJson}`);

      this.gerarRelatorio();
    } catch (error) {
      console.error("❌ Erro ao salvar a planilha:", error);
    }
  }

  gerarRelatorio() {
    console.log("\n📋 RELATÓRIO DE COLETA ACISASH:");
    console.log("================================");

    const total = this.empresas.length;
    if (total === 0) return;

    const empresasPorCategoria = this.empresas.reduce((acc, emp) => {
      const cat = emp.categoria || "Indefinido";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📊 EMPRESAS POR CATEGORIA:");
    Object.keys(empresasPorCategoria)
      .sort()
      .forEach((cat) => {
        console.log(`- ${cat}: ${empresasPorCategoria[cat]} empresas`);
      });

    const comTelefone = this.empresas.filter(
      (e) => e.telefone && !e.telefone.includes("Não informado")
    ).length;
    const comEndereco = this.empresas.filter(
      (e) => e.endereco && !e.endereco.includes("Não informado")
    ).length;

    console.log("\n📈 ESTATÍSTICAS DE DADOS:");
    console.log(`- Total de empresas: ${total}`);
    console.log(`- Com telefone: ${comTelefone} (${((comTelefone / total) * 100).toFixed(1)}%)`);
    console.log(`- Com endereço: ${comEndereco} (${((comEndereco / total) * 100).toFixed(1)}%)`);
    console.log(`- Detalhes coletados com sucesso: ${this.detalhesColetados}`);
    console.log(`- Erros durante a coleta: ${this.errosDetalhes}`);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function executarScraping() {
  const scraper = new AcisashScraper();
  await scraper.iniciarScraping();
}

if (require.main === module) {
  executarScraping().catch(console.error);
}

module.exports = AcisashScraper;
