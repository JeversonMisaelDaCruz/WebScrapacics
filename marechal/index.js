const puppeteer = require("puppeteer");
const XLSX = require("xlsx");
const fs = require("fs");

class AcimacarScraper {
  constructor() {
    this.empresas = [];
    this.baseUrl = "https://www.acimacar.com.br/lista-de-associados/";
    this.letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  }

  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping da ACIMACAR...");

    let browser;
    let page;

    try {
      browser = await puppeteer.launch({
        headless: true, 
        defaultViewport: { width: 1280, height: 720 },
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-web-security",
          "--disable-features=VizDisplayCompositor",
        ],
      });

      console.log("📱 Browser iniciado com sucesso");

      page = await browser.newPage();
      console.log("📄 Nova página criada");

      await page.setDefaultTimeout(30000);
      console.log("⏱️ Timeout configurado");

      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      console.log("🤖 User Agent configurado");

      try {
        for (const letra of this.letras) {
          console.log(`📝 Processando letra: ${letra}`);
          await this.processarLetra(page, letra);

          await this.delay(2000);
        }

        console.log(
          `✅ Scraping concluído! Total de empresas encontradas: ${this.empresas.length}`
        );

        await this.salvarPlanilha();
      } catch (scrapingError) {
        console.error("❌ Erro durante o scraping:", scrapingError);
        throw scrapingError;
      }
    } catch (error) {
      console.error("❌ Erro ao inicializar browser/página:", error);
      throw error;
    } finally {
      if (page) {
        try {
          await page.close();
          console.log("📄 Página fechada");
        } catch (closeError) {
          console.warn("⚠️ Erro ao fechar página:", closeError.message);
        }
      }

      if (browser) {
        try {
          await browser.close();
          console.log("📱 Browser fechado");
        } catch (closeError) {
          console.warn("⚠️ Erro ao fechar browser:", closeError.message);
        }
      }
    }
  }

  async processarLetra(page, letra) {
    const url = `${this.baseUrl}${letra}`;

    try {
      console.log(`   🌐 Acessando: ${url}`);
      await page.goto(url, { waitUntil: "networkidle2" });

      try {
        await page.waitForSelector(".enderecoLista", { timeout: 10000 });
      } catch (timeoutError) {
        console.log(
          `   ⚠️ Timeout ao aguardar conteúdo da letra ${letra} - pode não haver empresas`
        );
        return;
      }

      const empresasLetra = await page.evaluate((letraAtual) => {
        const empresasElementos = document.querySelectorAll(".enderecoLista");
        const empresas = [];

        empresasElementos.forEach((elemento, index) => {
          try {
            const ramoAtividadeElement = elemento.querySelector(".ramoAtividade");
            const ramoAtividade = ramoAtividadeElement
              ? ramoAtividadeElement.textContent.trim()
              : "";

            const textoCompleto = elemento.textContent || "";
            const linhas = textoCompleto
              .split("\n")
              .map((linha) => linha.trim())
              .filter((linha) => linha);

            let endereco = "";

            for (const linha of linhas) {
              if (linha.match(/^(RUA|AVENIDA|TRAVESSA|ALAMEDA|ESTRADA|PRAÇA|R\.|AV\.|RODOVIA)/i)) {
                endereco = linha;
                break;
              }

              if (
                linha.includes(",") &&
                linha.length > 10 &&
                !linha.includes(".") &&
                linha !== ramoAtividade
              ) {
                endereco = linha;
                break;
              }
            }

            let nomeEmpresa = "";

            let elementoPai = elemento.parentElement;
            while (elementoPai && !nomeEmpresa) {
              const tituloEmpresa = elementoPai.querySelector(".titulo-empresa-principal");
              if (tituloEmpresa) {
                nomeEmpresa = tituloEmpresa.textContent.trim();
                break;
              }
              elementoPai = elementoPai.parentElement;
            }

            if (!nomeEmpresa) {
              const todosTitulos = document.querySelectorAll(".titulo-empresa-principal");

              const todosEnderecos = document.querySelectorAll(".enderecoLista");
              let indiceAtual = -1;
              for (let i = 0; i < todosEnderecos.length; i++) {
                if (todosEnderecos[i] === elemento) {
                  indiceAtual = i;
                  break;
                }
              }

              // Associar o título correspondente (mesmo índice)
              if (indiceAtual >= 0 && indiceAtual < todosTitulos.length) {
                nomeEmpresa = todosTitulos[indiceAtual].textContent.trim();
              }
            }

            // 3. Se ainda não encontrou, procurar em elementos de título gerais
            if (!nomeEmpresa) {
              let elementoPai = elemento.parentElement;
              while (elementoPai && !nomeEmpresa) {
                const possiveisNomes = elementoPai.querySelectorAll(
                  "h1, h2, h3, h4, h5, .nome, .empresa, .razao-social, .titulo"
                );
                if (possiveisNomes.length > 0) {
                  for (let el of possiveisNomes) {
                    const texto = el.textContent.trim();
                    if (
                      texto &&
                      texto !== ramoAtividade &&
                      !texto.includes("Lista de") &&
                      texto.length > 3
                    ) {
                      nomeEmpresa = texto;
                      break;
                    }
                  }
                }
                elementoPai = elementoPai.parentElement;
              }
            }

            if (!nomeEmpresa) {
              nomeEmpresa = `Empresa ${letraAtual}${(index + 1).toString().padStart(2, "0")}`;
            }

            if (ramoAtividade || endereco) {
              empresas.push({
                nome: nomeEmpresa,
                ramoAtividade: ramoAtividade || "Não informado",
                endereco: endereco || "Não informado",
                letra: letraAtual,
                url: window.location.href,
              });
            }
          } catch (error) {
            console.error("Erro ao processar elemento:", error);
          }
        });

        return empresas;
      }, letra);

      this.empresas.push(...empresasLetra);
      console.log(`   ✅ Encontradas ${empresasLetra.length} empresas na letra ${letra}`);
    } catch (error) {
      console.error(`❌ Erro ao processar letra ${letra}:`, error.message);
    }
  }

  async salvarPlanilha() {
    try {
      if (this.empresas.length === 0) {
        console.log("⚠️ Nenhuma empresa encontrada para salvar");
        return;
      }

      const dadosParaPlanilha = this.empresas.map((empresa, index) => ({
        ID: index + 1,
        Nome: empresa.nome,
        "Ramo de Atividade": empresa.ramoAtividade,
        Endereço: empresa.endereco,
        Letra: empresa.letra,
        URL: empresa.url,
        "Data Coleta": new Date().toLocaleDateString("pt-BR"),
        "Hora Coleta": new Date().toLocaleTimeString("pt-BR"),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(dadosParaPlanilha);

      const colWidths = [
        { wch: 5 }, // ID
        { wch: 40 }, // Nome
        { wch: 60 }, // Ramo de Atividade
        { wch: 50 }, // Endereço
        { wch: 8 }, // Letra
        { wch: 50 }, // URL
        { wch: 15 }, // Data Coleta
        { wch: 15 }, // Hora Coleta
      ];
      worksheet["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas ACIMACAR");

      const timestamp = new Date().toISOString().split("T")[0];
      const nomeArquivo = `acimacar_empresas_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);

      console.log(`📊 Planilha salva como: ${nomeArquivo}`);
      console.log(`📈 Total de empresas: ${this.empresas.length}`);

      const nomeJson = `acimacar_empresas_${timestamp}.json`;
      fs.writeFileSync(nomeJson, JSON.stringify(this.empresas, null, 2), "utf8");
      console.log(`💾 Backup JSON salvo como: ${nomeJson}`);

      this.gerarRelatorio();
    } catch (error) {
      console.error("❌ Erro ao salvar planilha:", error);
    }
  }

  gerarRelatorio() {
    console.log("\n📋 RELATÓRIO DE COLETA:");
    console.log("========================");

    const empresasPorLetra = {};
    this.empresas.forEach((empresa) => {
      const letra = empresa.letra || "Indefinido";
      empresasPorLetra[letra] = (empresasPorLetra[letra] || 0) + 1;
    });

    Object.keys(empresasPorLetra)
      .sort()
      .forEach((letra) => {
        console.log(`${letra}: ${empresasPorLetra[letra]} empresas`);
      });

    console.log("========================");
    console.log(`TOTAL GERAL: ${this.empresas.length} empresas`);

    const comRamoAtividade = this.empresas.filter(
      (e) => e.ramoAtividade !== "Não informado"
    ).length;
    const comEndereco = this.empresas.filter((e) => e.endereco !== "Não informado").length;

    console.log(`\n📊 ESTATÍSTICAS ADICIONAIS:`);
    console.log(
      `Empresas com ramo de atividade: ${comRamoAtividade} (${(
        (comRamoAtividade / this.empresas.length) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `Empresas com endereço: ${comEndereco} (${(
        (comEndereco / this.empresas.length) *
        100
      ).toFixed(1)}%)`
    );
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function executarScraping() {
  const scraper = new AcimacarScraper();
  await scraper.iniciarScraping();
}

if (require.main === module) {
  executarScraping().catch(console.error);
}

module.exports = AcimacarScraper;
