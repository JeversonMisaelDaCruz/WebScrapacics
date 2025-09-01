const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.acica.com.br";

class AcicCeuAzulScraper {
  constructor() {
    this.baseUrl = BASE_URL + "/associados";
  }

  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping ");
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
      console.error("❌ Erro fatal ACINA:", error.message);
    }

    console.log(`✅ ACINA (Nova Aurora) concluído! Total: ${empresas.length}`);
    return empresas;
  }

  encontrarCategorias($) {
    const categorias = [];

    // Busca por painéis de categoria (estrutura collapse)
    $(".panel").each((index, painel) => {
      const titulo = $(painel).find(".panel-title a");
      if (titulo.length) {
        const nomeCompleto = titulo.text().trim();
        // Remove a contagem de empresas e símbolos extras
        const nome = nomeCompleto
          .replace(/\s*\(\s*\d+\s*\)\s*$/, "")
          .replace(/^\s*[\+\-]\s*/, "")
          .trim();
        const href = titulo.attr("href");

        if (href && nome) {
          categorias.push({
            index,
            nome,
            href,
            painel: $(painel), // Guardamos o painel para processar depois
          });
        }
      }
    });

    return categorias;
  }

  async processarCategoria($, categoria) {
    const empresasCategoria = [];

    try {
      // Obtém o ID do painel collapse
      const idDoPainel = categoria.href.substring(1); // Remove o #
      const painelCategoria = $(`#${idDoPainel}`);

      if (painelCategoria.length) {
        const linhas = painelCategoria.find("table.table tbody tr");

        for (let j = 0; j < linhas.length; j++) {
          const linha = linhas.eq(j);
          const colunas = linha.find("td");

          if (colunas.length >= 3) {
            // Primeira coluna: nome da empresa
            const nomeTabela = colunas.eq(0).text().trim() || "";

            // Segunda coluna: extrair telefone do link do WhatsApp (se houver)
            let telefoneTabela = null;
            const whatsappA = colunas.eq(1).find("a[href^='https://api.whatsapp.com/send?phone=']");
            if (whatsappA.length) {
              const href = whatsappA.attr("href");
              const match = href.match(/phone=([^&]+)/);
              if (match) {
                telefoneTabela = match[1];
              }
            }

            // Terceira coluna: link para detalhes
            const linkDetalhes = colunas.eq(2).find("a").attr("href") || "";

            if (nomeTabela && linkDetalhes) {
              console.log(`   📋 Processando: ${nomeTabela}`);

              const detalhes = await this.coletarDetalhesEmpresa(linkDetalhes);

              empresasCategoria.push({
                nome: detalhes.nome || nomeTabela,
                telefone: detalhes.telefoneCompleto || telefoneTabela || null,
                endereco: detalhes.endereco || null,
                cep: detalhes.cep || null,
                cidade: "Ceu Azul - PR",
                email: detalhes.email || null,
              });

              // Pausa entre requisições
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
        cep: null,
        telefoneCompleto: null,
        email: null,
      };

      // Nome da empresa (geralmente no título da caixa)
      dados.nome =
        $(".box-titulo p").first().text().trim() ||
        $("h1").first().text().trim() ||
        $("h2").first().text().trim() ||
        null;

      // Busca endereço e CEP na div.media-body que contém dados do endereço
      $(".dados-associado .media-body").each((_, elemento) => {
        const texto = $(elemento).text().trim();

        // Se contém CEP (formato XXXXX-XXX)
        if (texto.match(/\d{5}-\d{3}/)) {
          dados.endereco = texto.replace(/\s+/g, " ").trim();

          // Extrai CEP
          const cepMatch = texto.match(/(\d{5}-\d{3})/);
          if (cepMatch) {
            dados.cep = cepMatch[1];
          }
        }
      });

      // Busca telefone - procura por ícone de telefone
      $(".dados-associado").each((_, elemento) => {
        const $elemento = $(elemento);
        const html = $elemento.html();

        if (html && html.includes("fa-phone")) {
          const telefoneText = $elemento.find(".media-body").text().trim();
          if (telefoneText) {
            dados.telefoneCompleto = telefoneText;
          }
        }
      });

      // Busca email - procura por ícone de envelope ou link mailto
      $(".dados-associado").each((_, elemento) => {
        const $elemento = $(elemento);
        const html = $elemento.html();

        if (html && html.includes("fa-envelope")) {
          const emailText = $elemento.find(".media-body").text().trim();
          if (emailText && emailText.includes("@")) {
            dados.email = emailText;
          }
        }
      });

      // Busca email por link mailto também
      const mailtoLink = $("a[href^='mailto:']").attr("href");
      if (mailtoLink && !dados.email) {
        dados.email = mailtoLink.replace("mailto:", "");
      }

      return dados;
    } catch (error) {
      console.error(`   - Erro ao coletar detalhes de ${linkDetalhes}: ${error.message}`);
      return {
        nome: null,
        endereco: null,
        cep: null,
        telefoneCompleto: null,
        email: null,
      };
    }
  }
}

async function runAcicCeuAzul() {
  const scraper = new AcicCeuAzulScraper();
  return await scraper.iniciarScraping();
}

module.exports = runAcicCeuAzul;
