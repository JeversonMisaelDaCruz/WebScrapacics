const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.acicap.org.br";

class AcicapScraper {
  constructor() {
    this.baseUrl = BASE_URL + "/associado/";
  }

  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping da ACICAP...");
    const empresas = [];

    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const categorias = this.encontrarCategorias($);

      for (let i = 0; i < categorias.length; i++) {
        const categoria = categorias[i];
        console.log(`📂 Categoria ${i + 1}/${categorias.length}: ${categoria.nome}`);

        try {
          const empresasCategoria = await this.processarCategoria($, categoria);
          empresas.push(...empresasCategoria);
        } catch (error) {
          console.error(`❌ Erro categoria "${categoria.nome}":`, error.message);
        }
      }
    } catch (error) {
      console.error("❌ Erro fatal ACICAP:", error.message);
    }

    console.log(`✅ ACICAP concluído! Total: ${empresas.length}`);
    return empresas;
  }

  encontrarCategorias($) {
    const categorias = [];
    $(".single-faq").each((index, acordeao) => {
      const titulo = $(acordeao).find(".faq-title a");
      if (titulo.length) {
        const nomeCompleto = titulo.text().trim();
        const nome = nomeCompleto.replace(/\s*\(\d+\)\s*$/, "").replace(/^\s*[\+\-]\s*/, "");
        const href = titulo.attr("href");
        if (href && nome) {
          categorias.push({ index, nome, href });
        }
      }
    });
    return categorias;
  }

  async processarCategoria($, categoria) {
    const empresasCategoria = [];

    try {
      const idDoPainel = categoria.href.substring(1);
      const painelCategoria = $(`[id="${idDoPainel}"]`);

      if (painelCategoria.length) {
        const linhas = painelCategoria.find("tbody tr");

        for (let j = 0; j < linhas.length; j++) {
          const linha = linhas.eq(j);
          const colunas = linha.find("td");

          if (colunas.length >= 3) {
            const nomeTabela = colunas.eq(0).text().trim() || "";
            const telefoneTabela = colunas.eq(1).text().trim() || "";
            const linkDetalhes = colunas.eq(2).find("a").attr("href") || "";

            if (nomeTabela && linkDetalhes) {
              const detalhes = await this.coletarDetalhesEmpresa(linkDetalhes);

              // Extrai o CEP da string de endereço
              const enderecoCompleto = detalhes.endereco || null;

              empresasCategoria.push({
                nome: detalhes.nome || nomeTabela,
                telefone: detalhes.telefoneCompleto || telefoneTabela || null,
                endereco: enderecoCompleto,
                cep: '',
                cidade: '',
              });

              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Erro categoria ${categoria.nome}:`, error.message);
      return [];
    }

    return empresasCategoria;
  }

  async coletarDetalhesEmpresa(linkDetalhes) {
    try {
      const url = linkDetalhes.startsWith("http") ? linkDetalhes : BASE_URL + linkDetalhes;
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);
      const dados = {
        nome: null,
        endereco: null,
        telefoneCompleto: null,
      };

      // --- INÍCIO DA CORREÇÃO ---
      // Pega o nome da empresa, que geralmente está em um H2
      dados.nome = $("h2.mb-3").first().text().trim() || null;

      // Busca os dados no container correto (div.small-list-feature) e nos elementos <li>
      const infoContainer = $(".small-list-feature");
      if (infoContainer.length) {
        infoContainer.find("li").each((_, li) => {
          // Itera sobre cada item da lista (<li>)
          const elemento = $(li);
          const texto = elemento.text().trim();
          const html = elemento.html();

          // Verifica se o item da lista contém o ícone de mapa
          if (html && html.includes("fa-map-marker")) {
            dados.endereco = texto;
          }
          // Verifica se o item da lista contém o ícone de telefone
          if (html && html.includes("fa-phone")) {
            dados.telefoneCompleto = texto;
          }
        });
      }
      // --- FIM DA CORREÇÃO ---

      return dados;
    } catch (error) {
      // Em caso de erro na requisição, retorna objeto vazio para não quebrar o processo
      console.error(`   - Erro ao coletar detalhes de ${linkDetalhes}: ${error.message}`);
      return {
        nome: null,
        endereco: null,
        telefoneCompleto: null,
      };
    }
  }
}

async function runAcicapScraper() {
  const scraper = new AcicapScraper();
  return await scraper.iniciarScraping();
}

module.exports = runAcicapScraper;
  