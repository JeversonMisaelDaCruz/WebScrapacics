const puppeteer = require("puppeteer");
const XLSX = require("xlsx");
const fs = require("fs");

class AcicapScraper {
  constructor() {
    this.empresas = [];
    this.baseUrl = "https://www.acicap.org.br/associado/";
    this.detalhesColetados = 0;
    this.errosDetalhes = 0;
  }

  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping da ACICAP...");
    let browser;
    let page;
    try {
      browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1280, height: 800 },
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      console.log("📱 Browser iniciado com sucesso");

      page = await browser.newPage();
      await page.setDefaultTimeout(60000);
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      console.log("🌐 Acessando página principal...");
      await page.goto(this.baseUrl, { waitUntil: "networkidle2" });
      await this.delay(2000);

      const categorias = await this.encontrarCategorias(page);
      console.log(`📋 Encontradas ${categorias.length} categorias`);

      for (let i = 0; i < categorias.length; i++) {
        const categoria = categorias[i];
        console.log(`\n📂 Processando categoria ${i + 1}/${categorias.length}: ${categoria.nome}`);

        await this.processarCategoria(page, categoria, browser);
        await this.delay(1000);
      }

      console.log(`\n✅ Scraping concluído!`);
      console.log(`📊 Total de empresas processadas: ${this.empresas.length}`);
      console.log(`✅ Detalhes coletados com sucesso: ${this.detalhesColetados}`);
      console.log(`❌ Erros ao coletar detalhes: ${this.errosDetalhes}`);

      await this.salvarPlanilha();
    } catch (error) {
      console.error("❌ Erro fatal durante o scraping:", error);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  async encontrarCategorias(page) {
    return await page.evaluate(() => {
      const categorias = [];
      const acordeoes = document.querySelectorAll(".single-faq");
      acordeoes.forEach((acordeao, index) => {
        const titulo = acordeao.querySelector(".faq-title a");
        if (titulo) {
          const nomeCompleto = titulo.textContent.trim();
          const nome = nomeCompleto.replace(/\s*\(\d+\)\s*$/, "").replace(/^\s*[\+\-]\s*/, "");
          const href = titulo.getAttribute("href");
          if (href) {
            categorias.push({ index, nome, href });
          }
        }
      });
      return categorias;
    });
  }

  async processarCategoria(page, categoria, browser) {
    try {
      const linkCategoria = await page.$(`a[href="${categoria.href}"]`);
      if (linkCategoria) {
        await linkCategoria.click();
        await this.delay(2000);
      } else {
        console.warn(`  ⚠️ Categoria "${categoria.nome}" não encontrada para clique.`);
        return;
      }

      const empresasCategoria = await page.evaluate(
        (categoriaNome, categoriaHref) => {
          const empresas = [];

          // ======================================================================
          // CORREÇÃO APLICADA:
          // Usamos um seletor de atributo [id="..."] para selecionar o painel.
          // Isso é mais robusto para IDs que são apenas números.
          // 1. Pega o href (ex: "#98")
          // 2. Remove o "#" para obter o ID (ex: "98")
          // 3. Monta o seletor `[id="98"]`
          const idDoPainel = categoriaHref.substring(1);
          const painelCategoria = document.querySelector(`[id="${idDoPainel}"]`);
          // ======================================================================

          if (painelCategoria) {
            const linhas = painelCategoria.querySelectorAll("tbody tr");
            linhas.forEach((linha) => {
              const colunas = linha.querySelectorAll("td");
              if (colunas.length >= 3) {
                const nome = colunas[0]?.textContent?.trim() || "";
                const telefone = colunas[1]?.textContent?.trim() || "";
                const linkDetalhes = colunas[2]?.querySelector("a")?.href || "";

                if (nome && linkDetalhes) {
                  empresas.push({ nome, telefone, linkDetalhes, categoria: categoriaNome });
                }
              }
            });
          }
          return empresas;
        },
        categoria.nome,
        categoria.href
      );

      if (empresasCategoria.length > 0) {
        console.log(`  📦 Encontradas ${empresasCategoria.length} empresas na categoria`);

        for (let j = 0; j < empresasCategoria.length; j++) {
          const empresa = empresasCategoria[j];
          console.log(
            `    🔍 Coletando detalhes ${j + 1}/${empresasCategoria.length}: ${empresa.nome}`
          );
          const detalhes = await this.coletarDetalhesEmpresa(empresa.linkDetalhes, browser);
          const empresaCompleta = { ...empresa, ...detalhes, dataColeta: new Date().toISOString() };
          this.empresas.push(empresaCompleta);
          await this.delay(500);
        }
      } else {
        console.log(`  ℹ️ Nenhuma empresa encontrada na categoria "${categoria.nome}".`);
      }

      if (linkCategoria) {
        await linkCategoria.click();
        await this.delay(1000);
      }
    } catch (error) {
      console.error(
        `❌ Erro ao processar categoria ${categoria.nome} (href: ${categoria.href}):`,
        error.message
      );
      console.error(error.stack);
    }
  }

  async coletarDetalhesEmpresa(linkDetalhes, browser) {
    let paginaDetalhes;
    try {
      paginaDetalhes = await browser.newPage();
      await paginaDetalhes.setDefaultTimeout(30000);
      await paginaDetalhes.goto(linkDetalhes, { waitUntil: "networkidle2" });
      await this.delay(1000);

      const detalhes = await paginaDetalhes.evaluate(() => {
        const dados = {
          endereco: "Não informado",
          email: "Não informado",
          site: "Não informado",
          descricao: "Não informado",
          responsavel: "Não informado",
          telefoneCompleto: "Não informado",
          whatsapp: "Não informado",
          facebook: "Não informado",
          instagram: "Não informado",
        };

        const container = document.querySelector(".single-project-content");
        if (!container) return dados;

        const p_elements = Array.from(container.querySelectorAll("p"));

        p_elements.forEach((p) => {
          const texto = p.textContent.trim();
          const html = p.innerHTML;

          if (html.includes("fa-map-marker")) dados.endereco = texto;
          if (html.includes("fa-user")) dados.responsavel = texto;
          if (html.includes("fa-phone")) dados.telefoneCompleto = texto;
          if (html.includes("fa-whatsapp")) dados.whatsapp = texto;
          if (html.includes("fa-envelope"))
            dados.email = p.querySelector("a")?.textContent?.trim() || texto;
          if (html.includes("fa-globe")) dados.site = p.querySelector("a")?.href || texto;
          if (html.includes("fa-facebook")) dados.facebook = p.querySelector("a")?.href || texto;
          if (html.includes("fa-instagram")) dados.instagram = p.querySelector("a")?.href || texto;
        });

        const descricaoElement = container.querySelector(".text-justify");
        if (descricaoElement) {
          dados.descricao = descricaoElement.textContent.trim();
        }

        return dados;
      });

      this.detalhesColetados++;
      return detalhes;
    } catch (error) {
      console.error(`  Erro ao coletar detalhes de ${linkDetalhes}: ${error.message}`);
      this.errosDetalhes++;
      return {
        endereco: "Erro ao coletar",
        descricao: "Erro ao coletar detalhes",
        erro: error.message,
      };
    } finally {
      if (paginaDetalhes) await paginaDetalhes.close().catch(() => {});
    }
  }

  async salvarPlanilha() {
    try {
      if (this.empresas.length === 0) {
        console.log("\n Nenhuma empresa foi coletada. O arquivo não será gerado.");
        return;
      }

      const dadosParaPlanilha = this.empresas.map((empresa, index) => ({
        ID: index + 1,
        "Nome da Empresa": empresa.nome || "Não informado",
        Categoria: empresa.categoria || "Não informado",
        "Telefone (Lista)": empresa.telefone || "Não informado",
        "Telefone (Detalhes)": empresa.telefoneCompleto || "Não informado",
        WhatsApp: empresa.whatsapp || "Não informado",
        Email: empresa.email || "Não informado",
        Site: empresa.site || "Não informado",
        Endereço: empresa.endereco || "Não informado",
        Responsável: empresa.responsavel || "Não informado",
        Descrição: empresa.descricao || "Não informado",
        Facebook: empresa.facebook || "Não informado",
        Instagram: empresa.instagram || "Não informado",
        "Link Detalhes": empresa.linkDetalhes || "Não informado",
        "Data Coleta": new Date(empresa.dataColeta).toLocaleDateString("pt-BR"),
        "Hora Coleta": new Date(empresa.dataColeta).toLocaleTimeString("pt-BR"),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(dadosParaPlanilha);

      worksheet["!cols"] = [
        { wch: 5 },
        { wch: 40 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
        { wch: 30 },
        { wch: 50 },
        { wch: 30 },
        { wch: 60 },
        { wch: 40 },
        { wch: 40 },
        { wch: 50 },
        { wch: 12 },
        { wch: 10 },
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas ACICAP");

      const timestamp = new Date().toISOString().split("T")[0];
      const nomeArquivo = `acicap_empresas_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, nomeArquivo);

      console.log(`\n💾 Planilha salva com sucesso como: ${nomeArquivo}`);

      const nomeJson = `acicap_empresas_${timestamp}.json`;
      fs.writeFileSync(nomeJson, JSON.stringify(this.empresas, null, 2), "utf8");
      console.log(`💾 Backup JSON salvo como: ${nomeJson}`);

      this.gerarRelatorio();
    } catch (error) {
      console.error("❌ Erro ao salvar a planilha:", error);
    }
  }

  gerarRelatorio() {
    console.log("\n📋 RELATÓRIO DE COLETA ACICAP:");
    console.log("===============================");

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

    const comEmail = this.empresas.filter(
      (e) => e.email && !e.email.includes("Não informado")
    ).length;
    const comSite = this.empresas.filter((e) => e.site && !e.site.includes("Não informado")).length;
    const comEndereco = this.empresas.filter(
      (e) => e.endereco && !e.endereco.includes("Não informado")
    ).length;
    const comWhatsApp = this.empresas.filter(
      (e) => e.whatsapp && !e.whatsapp.includes("Não informado")
    ).length;

    console.log("\n📈 ESTATÍSTICAS DE DADOS:");
    console.log(`- Total de empresas: ${total}`);
    console.log(`- Com email: ${comEmail} (${((comEmail / total) * 100).toFixed(1)}%)`);
    console.log(`- Com site: ${comSite} (${((comSite / total) * 100).toFixed(1)}%)`);
    console.log(`- Com endereço: ${comEndereco} (${((comEndereco / total) * 100).toFixed(1)}%)`);
    console.log(`- Com WhatsApp: ${comWhatsApp} (${((comWhatsApp / total) * 100).toFixed(1)}%)`);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

async function executarScraping() {
  const scraper = new AcicapScraper();
  await scraper.iniciarScraping();
}

if (require.main === module) {
  executarScraping().catch(console.error);
}

module.exports = AcicapScraper;
