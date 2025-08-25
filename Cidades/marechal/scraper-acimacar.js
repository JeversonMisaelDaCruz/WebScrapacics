const axios = require("axios");
const cheerio = require("cheerio");

class AcimacarScraper {
  constructor() {
    this.baseUrl = "https://www.acimacar.com.br/lista-de-associados/";
    this.letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
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
    const empresas = [];

    try {
      for (const letra of this.letras) {
        console.log(`📝 Processando letra: ${letra}`);
        const empresasLetra = await this.processarLetra(letra);
        empresas.push(...empresasLetra);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error("❌ Erro fatal ACIMACAR:", error);
    }

    return empresas;
  }

  async processarLetra(letra) {
    const url = `${this.baseUrl}${letra}`;
    const empresasLetra = [];

    try {
      const response = await this.axiosInstance.get(url);
      const $ = cheerio.load(response.data);

      let empresasDaPagina = [];

      // Tentar extrair com seletores principais
      const items = $("li.linhaAssociado");
      
      items.each((index, item) => {
        const $item = $(item);
        const nomeEmpresa = $item.find(".titulo-empresa-principal").text().trim();
        
        let endereco = $item.find(".enderecoLista").text().trim() || null;
        let telefone = $item.find(".foneLista").text().trim() || null;

        if (endereco) {
          endereco = endereco.replace($item.find(".ramoAtividade").text().trim(), '')
        }

        if (nomeEmpresa) {
          empresasDaPagina.push({
            nome: nomeEmpresa,
            endereco,
            telefone,
            cep: '',
          });
        }
      });

      // Limpar endereço e adicionar cidade
      const empresasProcessadas = empresasDaPagina.map((empresa) => ({
        nome: empresa.nome,
        telefone: empresa.telefone || null,
        endereco: this.limparEndereco(empresa.endereco),
        cep: empresa.cep || null,
        cidade: '',
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
