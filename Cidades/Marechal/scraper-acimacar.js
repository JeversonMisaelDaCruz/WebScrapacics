const puppeteer = require("puppeteer");

class AcimacarScraper {
  constructor() {
    this.baseUrl = "https://www.acimacar.com.br/lista-de-associados/";
    this.letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  }

  // Função para limpar endereço removendo a cidade
  limparEndereco(endereco) {
    if (!endereco) return null;

    let enderecoLimpo = endereco
      .replace(/Marechal Cândido Rondon/gi, "")
      .replace(/Marechal C\. Rondon/gi, "")
      .replace(/MCR/gi, "")
      .replace(/\s*-\s*PR/gi, "")
      .replace(/\s*,\s*PR/gi, "")
      .replace(/\s*PR\s*/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,\-]+|[\s,\-]+$/g, "")
      .trim();

    return enderecoLimpo || endereco;
  }

  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping da ACIMACAR...");
    let browser;
    let page;
    const empresas = [];

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      page = await browser.newPage();
      await page.setDefaultTimeout(30000);
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      for (const letra of this.letras) {
        console.log(`📝 Processando letra: ${letra}`);
        const empresasLetra = await this.processarLetra(page, letra);
        empresas.push(...empresasLetra);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("❌ Erro fatal ACIMACAR:", error);
    } finally {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }

    return empresas;
  }

  async processarLetra(page, letra) {
    const url = `${this.baseUrl}${letra}`;
    const empresasLetra = [];

    try {
      await page.goto(url, { waitUntil: "networkidle2" });

      let empresasDaPagina = [];

      try {
        await page.waitForSelector(".item-lista-associado", { timeout: 5000 });

        // ✅ CORREÇÃO: Melhor extração de dados
        empresasDaPagina = await page.evaluate(() => {
          const empresas = [];
          const items = document.querySelectorAll(".item-lista-associado");

          items.forEach((item) => {
            const nomeEmpresa = item.querySelector(".titulo-empresa-principal")?.textContent.trim();
            const enderecoElement = item.querySelector(".enderecoLista");
            const telefoneElement = item.querySelector(".telefoneLista");

            let endereco = enderecoElement?.textContent.trim() || null;
            let telefone = telefoneElement?.textContent.trim() || null;
            let cep = null;

            // Extrair CEP do endereço
            if (endereco) {
              const cepMatch = endereco.match(/\d{5}-\d{3}/);
              if (cepMatch) {
                cep = cepMatch[0];
                endereco = endereco.replace(cepMatch[0], "").trim();
              }
            }

            // ✅ CORREÇÃO: Buscar telefone em todo o item se não encontrou
            if (!telefone) {
              const textoCompleto = item.textContent || item.innerText || "";
              const telefoneMatch = textoCompleto.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/);
              if (telefoneMatch) telefone = telefoneMatch[0];
            }

            // ✅ CORREÇÃO: Buscar endereço em todo o item se não encontrou
            if (!endereco) {
              const textoCompleto = item.textContent || item.innerText || "";
              const linhas = textoCompleto
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l);

              for (const linha of linhas) {
                if (
                  linha.length > 15 &&
                  linha.length < 200 &&
                  (linha.toLowerCase().includes("rua") ||
                    linha.toLowerCase().includes("av") ||
                    linha.toLowerCase().includes("avenida") ||
                    /\d+/.test(linha))
                ) {
                  const cepMatch = linha.match(/\d{5}-\d{3}/);
                  if (cepMatch) {
                    cep = cepMatch[0];
                    endereco = linha.replace(cepMatch[0], "").trim();
                  } else {
                    endereco = linha;
                  }
                  break;
                }
              }
            }

            if (nomeEmpresa) {
              empresas.push({
                nome: nomeEmpresa,
                endereco,
                telefone,
                cep,
              });
            }
          });

          return empresas;
        });
      } catch (timeoutError) {
        // Fallback para seletores alternativos
        empresasDaPagina = await page.evaluate(() => {
          const empresas = [];
          const elementos = document.querySelectorAll("div, article, li");

          elementos.forEach((element) => {
            const texto = element.innerText || element.textContent || "";
            if (texto.length < 20 || texto.length > 500) return;

            const linhas = texto
              .split("\n")
              .map((l) => l.trim())
              .filter((l) => l);

            let nome = null;
            let telefone = null;
            let endereco = null;
            let cep = null;

            for (const linha of linhas) {
              if (
                !nome &&
                linha.length > 3 &&
                linha.length < 100 &&
                !linha.match(/\d{2,}/) &&
                !linha.includes("@")
              ) {
                nome = linha;
                continue;
              }

              const telefoneMatch = linha.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/);
              if (telefoneMatch && !telefone) telefone = telefoneMatch[0];

              const cepMatch = linha.match(/\d{5}-\d{3}/);
              if (cepMatch && !cep) {
                cep = cepMatch[0];
                endereco = linha.replace(cepMatch[0], "").trim();
              } else if (
                !endereco &&
                linha.length > 10 &&
                linha.length < 200 &&
                /\d+/.test(linha)
              ) {
                endereco = linha;
              }
            }

            if (nome) {
              empresas.push({
                nome: nome.trim(),
                telefone: telefone?.trim(),
                endereco: endereco?.trim(),
                cep: cep?.trim(),
              });
            }
          });

          return empresas;
        });
      }

      // ✅ CORREÇÃO: Limpar endereço e adicionar cidade
      const empresasProcessadas = empresasDaPagina.map((empresa) => ({
        nome: empresa.nome,
        telefone: empresa.telefone || null,
        endereco: this.limparEndereco(empresa.endereco),
        cep: empresa.cep || null,
        cidade: "Marechal Cândido Rondon",
      }));

      empresasLetra.push(...empresasProcessadas);
      console.log(`   ✅ Letra ${letra}: ${empresasProcessadas.length} empresas`);
    } catch (error) {
      console.error(`❌ Erro letra ${letra}:`, error.message);
    }

    return empresasLetra;
  }
}

async function runAcimacarScraper() {
  const scraper = new AcimacarScraper();
  return scraper.iniciarScraping();
}

module.exports = runAcimacarScraper;
