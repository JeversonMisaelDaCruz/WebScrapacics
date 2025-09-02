const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://www.acima.org.br";

class AcicMatelandiaScraper {
  constructor() {
    this.baseUrl = BASE_URL + "/associados";
  }

  async iniciarScraping() {
    console.log("🚀 Iniciando web scraping de Matelandia");
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

      console.log(`📂 Encontradas ${categorias.length} categorias`);

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
      console.error("❌ Erro fatal no scraping:", error.message);
    }

    console.log(`✅ Scraping concluído! Total: ${empresas.length} empresas`);
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
            painel: $(painel),
          });
        }
      }
    });

    return categorias;
  }

  async processarCategoria($, categoria) {
    const empresasCategoria = [];

    try {
      const idDoPainel = categoria.href.substring(1); // Remove o #
      const painelCategoria = $(`#${idDoPainel}`);

      if (painelCategoria.length) {
        const linhas = painelCategoria.find("table.table tbody tr");
        console.log(`   📋 Encontradas ${linhas.length} empresas na categoria`);

        for (let j = 0; j < linhas.length; j++) {
          const linha = linhas.eq(j);
          const colunas = linha.find("td");

          if (colunas.length >= 3) {
            // Primeira coluna: nome da empresa
            const nomeTabela = colunas.eq(0).text().trim() || "";

            // Segunda coluna: extrair telefone do link do WhatsApp (se houver)
            let telefoneTabela = null;
            const whatsappLink = colunas.eq(1).find("a[href*='whatsapp.com']");
            if (whatsappLink.length) {
              const href = whatsappLink.attr("href");
              const phoneMatch = href.match(/phone=(\d+)/);
              if (phoneMatch) {
                const numeroCompleto = phoneMatch[1];

                if (numeroCompleto.length >= 11) {
                  const ddd = numeroCompleto.substr(-11, 2);
                  const numero = numeroCompleto.substr(-9);
                  const parte1 = numero.substr(0, 4);
                  const parte2 = numero.substr(4);
                  telefoneTabela = `(${ddd}) ${parte1}-${parte2}`;
                }
              }
            }

            // Terceira coluna: link para detalhes
            const linkDetalhes = colunas.eq(2).find("a").attr("href") || "";

            if (nomeTabela && linkDetalhes) {
              console.log(`   📋 Processando: ${nomeTabela}`);

              const detalhes = await this.coletarDetalhesEmpresa(linkDetalhes);

              const empresa = {
                nome: detalhes.nome || nomeTabela,
                telefone: detalhes.telefoneCompleto || telefoneTabela || null,
                endereco: detalhes.endereco || null,
                cep: detalhes.cep || null,
                cidade: "Matelandia - PR",
                email: detalhes.email || null,
              };

              empresasCategoria.push(empresa);

              // Debug: mostra os dados coletados
              console.log(`     ✓ Nome: ${empresa.nome}`);
              console.log(`     ✓ Telefone: ${empresa.telefone || "N/A"}`);
              console.log(`     ✓ Email: ${empresa.email || "N/A"}`);
              console.log(`     ✓ Endereço: ${empresa.endereco || "N/A"}`);

              // Pausa entre requisições
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao processar categoria ${categoria.nome}:`, error.message);
      return [];
    }

    return empresasCategoria;
  }

  async coletarDetalhesEmpresa(linkDetalhes) {
    try {
      const url = linkDetalhes.startsWith("http") ? linkDetalhes : BASE_URL + linkDetalhes;
      console.log(`     🔗 Coletando detalhes de: ${url}`);

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

      // Nome da empresa (no título da caixa)
      const nomeElement = $(".box-titulo p").first();
      if (nomeElement.length) {
        dados.nome = nomeElement.text().trim();
      }

      // Busca endereço e CEP - primeira div.media-body sem ícones
      $(".dados-associado .media-body").each((index, elemento) => {
        const $elemento = $(elemento);
        const texto = $elemento.text().trim();

        // Verifica se é a primeira div (endereço) - não tem ícones de telefone, email, etc.
        const temIcone =
          $elemento.siblings(".media-left").find("i.fa-phone, i.fa-envelope").length > 0;

        if (!temIcone && texto.match(/\d{5}-\d{3}/)) {
          
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
        const iconePhone = $elemento.find(".media-left i.fa-phone");

        if (iconePhone.length) {
          const telefoneText = $elemento.find(".media-body").text().trim();
          if (telefoneText && telefoneText.match(/\(\d{2}\)/)) {
            dados.telefoneCompleto = telefoneText;
          }
        }
      });

      $(".dados-associado").each((_, elemento) => {
        const $elemento = $(elemento);
        const iconeEmail = $elemento.find(".media-left i.fa-envelope");

        if (iconeEmail.length) {
          const emailText = $elemento.find(".media-body").text().trim();
          if (emailText && emailText.includes("@")) {
            dados.email = emailText;
          }
        }
      });

      const mailtoLink = $("a[href^='mailto:']").attr("href");
      if (mailtoLink && !dados.email) {
        dados.email = mailtoLink.replace("mailto:", "");
      }

      return dados;
    } catch (error) {
      console.error(`   ❌ Erro ao coletar detalhes de ${linkDetalhes}: ${error.message}`);
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

async function runAcicMatelandia() {
  const scraper = new AcicMatelandiaScraper();
  return await scraper.iniciarScraping();
}

module.exports = runAcicMatelandia;
