const axios = require("axios");
const cheerio = require("cheerio");

class CorbeliaScraper {
  constructor() {
    this.baseUrl = "https://www.acicorb.com.br";
    this.cidade = "Corbélia";
  }

  // Função para extrair links dos associados
  async getAssociadosLinks(html) {
    const $ = cheerio.load(html);
    const links = [];

    // Para cada tabela de cada categoria
    $(".panel-body table tr").each((_, tr) => {
      const nome = $(tr).find("td").first().text().trim();
      const linkTag = $(tr).find("a[href*='/associado/']");
      const href = linkTag.attr("href");

      if (nome && href) {
        links.push({
          nome,
          url: href.startsWith("http") ? href : this.baseUrl + href,
        });
      }
    });

    return links;
  }

  // Função para extrair dados de uma empresa específica
  async getAssociadoData(empresa) {
    try {
      console.log(`   📋 Processando: ${empresa.nome}`);

      const response = await axios.get(empresa.url, {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const $ = cheerio.load(response.data);

      // Extrair endereço
      let endereco = "";
      const enderecoDiv = $(".col-sm-7 .media.dados-associado .media-body").first();
      if (enderecoDiv.length) {
        endereco = enderecoDiv
          .html()
          .replace(/<br>/g, " ")
          .replace(/<[^>]*>/g, "") // Remove todas as tags HTML
          .replace(/\s+/g, " ")
          .trim();
      }

      // Extrair telefones
      let telefones = [];
      $(".col-sm-7 .media.dados-associado").each((_, el) => {
        const icon = $(el).find(".media-left i.fa-phone");
        if (icon.length) {
          const telText = $(el).find(".media-body").text().replace(/\s+/g, " ").trim();

          // Pode ter mais de um telefone
          const telsArray = telText
            .split(/[\n\r]/)
            .map((t) => t.trim())
            .filter((t) => t);

          telefones.push(...telsArray);
        }
      });

      // Extrair CEP do endereço se existir
      let cep = null;
      if (endereco) {
        const cepMatch = endereco.match(/\d{5}-?\d{3}/);
        if (cepMatch) {
          cep = cepMatch[0];
          // Remove o CEP do endereço
          endereco = endereco.replace(cepMatch[0], "").trim();
        }
      }

      // Limpar endereço removendo a cidade
      endereco = this.limparEndereco(endereco);

      // Formatação específica para gerador de etiquetas
      const telefoneFormatado = telefones.length > 0 ? telefones[0] : "";
      const enderecoFormatado = endereco ? endereco.toUpperCase() : "";
      const cepFormatado = cep || "";

      return {
        nome: `A${empresa.nome}`,
        telefone: `B${telefoneFormatado}`,
        endereco: `C${enderecoFormatado}`,
        cep: `D${cepFormatado}`,
        cidade: `E${this.cidade.toUpperCase()}/PR`,
      };
    } catch (error) {
      console.error(`   ❌ Erro ao processar ${empresa.nome}:`, error.message);
      return {
        nome: `A${empresa.nome}`,
        telefone: "B",
        endereco: "C",
        cep: "D",
        cidade: `E${this.cidade.toUpperCase()}/PR`,
      };
    }
  }

  // Função para limpar endereço removendo a cidade
  limparEndereco(endereco) {
    if (!endereco) return null;

    let enderecoLimpo = endereco
      .replace(/Corbélia/gi, "")
      .replace(/\s*-\s*PR/gi, "")
      .replace(/\s*,\s*PR/gi, "")
      .replace(/\s*PR\s*/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,\-]+|[\s,\-]+$/g, "")
      .trim();

    return enderecoLimpo || endereco;
  }

  // Função principal de scraping
  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping da ACICORB (Corbélia)...");

    const empresas = [];

    try {
      // Buscar página de associados
      const url = `${this.baseUrl}/associados`;
      console.log(`📡 Acessando: ${url}`);

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      const associadosLinks = await this.getAssociadosLinks(response.data);
      console.log(`📋 Encontrados ${associadosLinks.length} associados para processar`);

      for (let i = 0; i < associadosLinks.length; i++) {
        const empresa = associadosLinks[i];
        console.log(`📍 [${i + 1}/${associadosLinks.length}] Processando...`);
        const dadosEmpresa = await this.getAssociadoData(empresa);
        empresas.push(dadosEmpresa);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(`✅ ACICORB (Corbélia) concluído: ${empresas.length} empresas processadas`);
    } catch (error) {
      console.error("❌ Erro fatal ACICORB:", error.message);
    }

    return empresas;
  }
}

// Função para ser chamada pelo index.js
async function runCorbeliaScraper() {
  const scraper = new CorbeliaScraper();
  return scraper.iniciarScraping();
}

module.exports = runCorbeliaScraper;
