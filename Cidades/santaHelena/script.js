const puppeteer = require("puppeteer");

class SantaHelenaScraper {
  constructor() {
    this.empresas = [];
    this.baseUrl = "https://acisash.com.br";
    this.categorias = [
      "/associados/agropecuarias/",
      "/associados/artigos-religiosos/",
      "/associados/assessoria/",
      "/associados/assistencia-tecnica/",
      "/associados/associacoes/",
      "/associados/auto-eletricas/",
      "/associados/auto-escolas/",
      "/associados/bancos-e-cooperativas-de-credito/",
      "/associados/bicicletaria/",
      "/associados/cartorios/",
      "/associados/comunicacao-e-propaganda/",
      "/associados/confeccoes/",
      "/associados/construcao-e-reforma/",
      "/associados/contabilidade/",
      "/associados/cosmeticos/",
      "/associados/cursos-treinamentos-e-educacao/",
      "/associados/disk-bebidas-e-gas/",
      "/associados/eletronicas/",
      "/associados/embalagens/",
      "/associados/energia-solar/",
      "/associados/entretenimento-e-lazer/",
      "/associados/estetica-e-beleza/",
      "/associados/eventos-e-decoracao/",
      "/associados/farmacias/",
      "/associados/floriculturas/",
      "/associados/foto-e-video/",
      "/associados/funerarias/",
      "/associados/gastronomia/",
      "/associados/grafica-e-comunicacao-visual/",
      "/associados/hoteis/",
      "/associados/imobiliaria/",
      "/associados/industrias/",
      "/associados/informatica/",
      "/associados/irrigacao-e-equipamentos/",
      "/associados/laboratorios/",
      "/associados/limpeza/",
      "/associados/livraria-e-papelaria/",
      "/associados/mecanicas-pecas-e-chapeacao/",
      "/associados/metalurgicas-e-tornearias/",
      "/associados/moveis-eletrodomesticos-e-utilidades/",
      "/associados/odontologia/",
      "/associados/postos-de-gasolina/",
      "/associados/provedor-de-internet/",
      "/associados/relojoaria-e-joalheria/",
      "/associados/saude-e-bem-estar/",
      "/associados/seguranca/",
      "/associados/sindicatos/",
      "/associados/sonorizacao/",
      "/associados/supermercados-e-mercados/",
      "/associados/transportes/",
      "/associados/veiculos-e-motos/",
      "/associados/vestuario-calcados-e-acessorios/",
      "/associados/veterinaria-e-petshop/",
      "/associados/vidracarias/",
    ];
  }

  // Função para limpar endereço removendo a cidade
  limparEndereco(endereco) {
    if (!endereco || endereco === "Não informado") return endereco;

    // Remove "Santa Helena" e variações do endereço
    let enderecoLimpo = endereco
      .replace(/Santa Helena/gi, "")
      .replace(/\s*-\s*PR/gi, "")
      .replace(/\s*,\s*PR/gi, "")
      .replace(/\s*PR\s*/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,\-]+|[\s,\-]+$/g, "")
      .trim();

    return enderecoLimpo || endereco;
  }

  async run() {
    console.log("🚀 Iniciando web scraping da ACISASH (Santa Helena)...");
    let browser;
    let page;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      for (const categoria of this.categorias) {
        try {
          await this.processarCategoria(page, categoria);
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`❌ Erro categoria ${categoria}:`, error.message);
        }
      }

      console.log(`✅ ACISASH concluído! Total: ${this.empresas.length}`);
    } catch (error) {
      console.error("❌ Erro Santa Helena:", error.message);
    } finally {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }

    return this.empresas;
  }

  async processarCategoria(page, categoriaUrl) {
    const fullUrl = `${this.baseUrl}${categoriaUrl}`;

    try {
      await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 15000 });

      const empresasDaPagina = await page.evaluate(() => {
        const empresas = [];
        const items = document.querySelectorAll(
          "div, article, li, p, span, h1, h2, h3, h4, h5, h6"
        );

        items.forEach((item) => {
          const texto = item.innerText || item.textContent || "";
          if (texto.length < 10 || texto.length > 500) return;

          const linhas = texto
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 3);
          if (linhas.length === 0) return;

          let nome = null;
          let telefone = null;
          let endereco = null;
          let cep = null;

          for (const linha of linhas) {
            if (
              !nome &&
              linha.length > 3 &&
              linha.length < 100 &&
              !linha.match(/^\d/) &&
              !linha.includes("@") &&
              !linha.toLowerCase().includes("telefone") &&
              !linha.toLowerCase().includes("endereço") &&
              !linha.toLowerCase().includes("acisa")
            ) {
              nome = linha;
              continue;
            }

            const telefoneMatch = linha.match(/\(?\d{2}\)?\s*\d{4,5}-?\d{4}/);
            if (telefoneMatch) telefone = telefoneMatch[0];

            const cepMatch = linha.match(/\d{5}-\d{3}/);
            if (cepMatch) {
              cep = cepMatch[0];
              endereco = linha.replace(cepMatch[0], "").trim();
            } else if (
              linha.length > 15 &&
              linha.length < 200 &&
              (linha.toLowerCase().includes("rua") ||
                linha.toLowerCase().includes("av") ||
                linha.toLowerCase().includes("avenida") ||
                /\d+/.test(linha))
            ) {
              endereco = linha;
            }
          }

          if (nome && nome.length > 3 && nome.length < 100) {
            empresas.push({ nome: nome.trim(), telefone, endereco, cep });
          }
        });

        return empresas.filter(
          (empresa, index, self) => index === self.findIndex((e) => e.nome === empresa.nome)
        );
      });

      // ✅ CORREÇÃO: Adicionar cidade e limpar endereço
      empresasDaPagina.forEach((empresa) => {
        this.empresas.push({
          nome: empresa.nome,
          telefone: empresa.telefone || null,
          endereco: this.limparEndereco(empresa.endereco),
          cep: empresa.cep || null,
          cidade: "Santa Helena", // ✅ CIDADE ADICIONADA
        });
      });

      const nomeCategoria = categoriaUrl
        .split("/")
        .filter((x) => x)
        .pop();
      console.log(`   📄 ${nomeCategoria}: ${empresasDaPagina.length} empresas`);
    } catch (error) {
      console.error(`❌ Erro categoria ${categoriaUrl}:`, error.message);
    }
  }
}

module.exports = SantaHelenaScraper;
