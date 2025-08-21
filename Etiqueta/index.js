const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");
const fs = require("fs");

// Configuração corrigida para folha A4363
const ETIQUETA_CONFIG = {
  largura: 283.46, // 10cm em pontos (mantido)
  altura: 109.115867,
  colunas: 2,
  linhas: 7,
  margemEsquerda: 8.5, // 0.3cm em pontos (mantido)
  margemDireita: 8.5, // 0.3cm em pontos (mantido)
  margemTopo: 42.52, // 1.5cm em pontos (1.5 * 28.3464567) - CORRIGIDO
  margemInferior: 42.52, // 1.5cm em pontos - CORRIGIDO
  espacamentoHorizontal: 0, // Etiquetas praticamente juntas
  espacamentoVertical: 0, // Etiquetas praticamente juntas
  deslocamentoPrimeiraEtiqueta: 28.35, // 1cm em pontos (1 * 28.3464567)
};

// Dimensões da página A4 em PORTRAIT (retrato)
const PAGINA_A4_PORTRAIT = {
  largura: 596.67, // Aproximadamente 21.05 cm em pontos
  altura: 834.79, // Aproximadamente 29.5 cm em pontos
};

// === Função para formatar o texto e evitar caixa alta ===
function formatarTexto(texto) {
  if (!texto) return "";
  return texto.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function lerPlanilha(nomeArquivo) {
  try {
    console.log("📖 Lendo planilha:", nomeArquivo);

    if (!fs.existsSync(nomeArquivo)) {
      throw new Error(`Arquivo ${nomeArquivo} não encontrado`);
    }

    const workbook = XLSX.readFile(nomeArquivo);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const dados = XLSX.utils.sheet_to_json(worksheet, {
      header: ["nome", "endereco", "bairro", "cep"],
      range: 1,
    });

    console.log("🔍 Amostra dos primeiros 3 registros:");
    dados.slice(0, 3).forEach((linha, idx) => {
      console.log(`   Linha ${idx + 1}:`, {
        nome: linha.nome ? `"${linha.nome}"` : "VAZIO",
        endereco: linha.endereco ? `"${linha.endereco}"` : "VAZIO",
        bairro: linha.bairro ? `"${linha.bairro}"` : "VAZIO",
        cep: linha.cep ? `"${linha.cep}"` : "VAZIO",
      });
    });

    const dadosValidos = dados.filter(
      (linha) =>
        linha.nome &&
        linha.nome.trim() !== "" &&
        linha.endereco &&
        linha.endereco.trim() !== "" &&
        linha.cep &&
        linha.cep.trim() !== ""
    );

    console.log(`📊 Total de registros válidos encontrados: ${dadosValidos.length}`);
    return dadosValidos;
  } catch (error) {
    console.error("❌ Erro ao ler planilha:", error.message);
    throw error;
  }
}

function criarPDF(dados, nomeArquivo) {
  console.log("🔨 Iniciando criação do PDF...");

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 0, left: 0, right: 0, bottom: 0 },
  });

  doc.pipe(fs.createWriteStream(nomeArquivo));

  let etiquetaAtual = 0;
  const totalEtiquetasPorPagina = ETIQUETA_CONFIG.colunas * ETIQUETA_CONFIG.linhas; // 14 etiquetas

  console.log(`📋 Processando ${dados.length} registros...`);
  console.log(`📄 Etiquetas por página: ${totalEtiquetasPorPagina}`);

  dados.forEach((destinatario, index) => {
    // Adiciona nova página quando necessário (mas não na primeira etiqueta)
    if (etiquetaAtual > 0 && etiquetaAtual % totalEtiquetasPorPagina === 0) {
      console.log(
        `📄 Adicionando nova página (${Math.ceil((etiquetaAtual + 1) / totalEtiquetasPorPagina)})`
      );
      doc.addPage();
    }

    const etiquetaNaPagina = etiquetaAtual % totalEtiquetasPorPagina;
    const coluna = etiquetaNaPagina % ETIQUETA_CONFIG.colunas;
    const linha = Math.floor(etiquetaNaPagina / ETIQUETA_CONFIG.colunas);

    // Calcula posição X (coluna 0 = esquerda, coluna 1 = direita)
    const x = ETIQUETA_CONFIG.margemEsquerda + coluna * ETIQUETA_CONFIG.largura;

    // CORRIGIDO: Calcula posição Y considerando o deslocamento da primeira etiqueta
    let y;
    if (linha === 0) {
      // Primeira linha: margem + deslocamento adicional
      y = ETIQUETA_CONFIG.margemTopo + ETIQUETA_CONFIG.deslocamentoPrimeiraEtiqueta;
    } else {
      // Demais linhas: primeira linha + (linha-1) * altura da etiqueta
      y =
        ETIQUETA_CONFIG.margemTopo +
        ETIQUETA_CONFIG.deslocamentoPrimeiraEtiqueta +
        linha * ETIQUETA_CONFIG.altura;
    }

    console.log(
      `🏷️  Etiqueta ${etiquetaAtual + 1}: (${coluna}, ${linha}) -> X:${x.toFixed(1)}, Y:${y.toFixed(
        1
      )} - ${destinatario.nome} | CEP: "${destinatario.cep}"`
    );

    desenharEtiqueta(doc, x, y, destinatario);

    etiquetaAtual++;
  });

  doc.end();
  console.log(`✅ PDF gerado com sucesso: ${nomeArquivo}`);
  console.log(`📊 Total de etiquetas criadas: ${dados.length}`);
  console.log(`📄 Total de páginas: ${Math.ceil(dados.length / totalEtiquetasPorPagina)}`);
}

function desenharEtiqueta(doc, x, y, destinatario) {
  const tamanhoFonteNome = 11; // Reduzido de 12 para 11
  const tamanhoFonteEndereco = 9; // Reduzido de 10 para 9
  const tamanhoFonteCidade = 9; // Reduzido de 10 para 9
  const tamanhoFonteCep = 10; // Reduzido de 11 para 10

  const margemInterna = 6; // Reduzido de 8 para 6
  const deslocamentoDireita = 28.35; // 1cm em pontos para a direita (mantido)
  const larguraUtil = ETIQUETA_CONFIG.largura - margemInterna * 2 - deslocamentoDireita;
  const alturaUtil = ETIQUETA_CONFIG.altura - margemInterna * 2;

  let posY = y + margemInterna + 2;
  const posX = x + margemInterna + deslocamentoDireita; // Nova posição X com deslocamento

  // === NOME ===
  doc
    .fontSize(tamanhoFonteNome)
    .font("Helvetica-Bold")
    .fillColor("#000000")
    .text(formatarTexto(destinatario.nome), posX, posY, {
      width: larguraUtil,
      align: "left",
      ellipsis: true,
      lineBreak: false, // Evita quebra de linha não desejada
    });

  const alturaNome = doc.heightOfString(formatarTexto(destinatario.nome), {
    width: larguraUtil,
    fontSize: tamanhoFonteNome,
    lineBreak: false,
  });
  posY += alturaNome + 3; // Reduzido de 4 para 3

  // === ENDEREÇO + BAIRRO ===
  let enderecoCompleto = "";
  if (destinatario.endereco) {
    enderecoCompleto = formatarTexto(destinatario.endereco);
    if (destinatario.bairro) {
      enderecoCompleto += " - " + formatarTexto(destinatario.bairro);
    }
  }

  if (enderecoCompleto) {
    doc
      .fontSize(tamanhoFonteEndereco)
      .font("Helvetica")
      .fillColor("#333333")
      .text(enderecoCompleto, posX, posY, {
        width: larguraUtil,
        align: "left",
        height: tamanhoFonteEndereco * 2, // Limita a altura para no máximo 2 linhas
      });

    const alturaEndereco = Math.min(
      doc.heightOfString(enderecoCompleto, {
        width: larguraUtil,
        fontSize: tamanhoFonteEndereco,
      }),
      tamanhoFonteEndereco * 2.5 // Limita altura máxima
    );
    posY += alturaEndereco + 3; // Reduzido de 4 para 3
  }

  // === CIDADE FIXA ===
  doc
    .fontSize(tamanhoFonteCidade)
    .font("Helvetica")
    .fillColor("#333333")
    .text("Toledo - PR", posX, posY, {
      width: larguraUtil,
      align: "left",
      lineBreak: false,
    });

  const alturaCidade = doc.heightOfString("Toledo - PR", {
    width: larguraUtil,
    fontSize: tamanhoFonteCidade,
    lineBreak: false,
  });
  posY += alturaCidade + 3; // Reduzido de 4 para 3
}

// === Função para validar configurações ===
function validarConfiguracoes() {
  const larguraTotal =
    ETIQUETA_CONFIG.colunas * ETIQUETA_CONFIG.largura +
    ETIQUETA_CONFIG.margemEsquerda +
    ETIQUETA_CONFIG.margemDireita;

  // Calcula altura considerando o novo esquema de posicionamento
  const alturaTotal =
    ETIQUETA_CONFIG.margemTopo +
    ETIQUETA_CONFIG.deslocamentoPrimeiraEtiqueta +
    (ETIQUETA_CONFIG.linhas - 1) * ETIQUETA_CONFIG.altura +
    ETIQUETA_CONFIG.altura + // Altura da última etiqueta
    ETIQUETA_CONFIG.margemInferior;

  console.log("🔍 Validando configurações da folha A4363:");
  console.log(
    `   📐 Largura calculada: ${(larguraTotal / 28.3464567).toFixed(2)}cm (deve ser ≤ 21cm)`
  );
  console.log(
    `   📐 Altura calculada: ${(alturaTotal / 28.3464567).toFixed(2)}cm (deve ser ≤ 29.7cm)`
  );
  console.log(
    `   📦 Total de etiquetas por folha: ${ETIQUETA_CONFIG.colunas * ETIQUETA_CONFIG.linhas}`
  );
  console.log(
    `   🎯 Primeira etiqueta inicia em: ${(
      (ETIQUETA_CONFIG.margemTopo + ETIQUETA_CONFIG.deslocamentoPrimeiraEtiqueta) /
      28.3464567
    ).toFixed(2)}cm do topo`
  );
  console.log(
    `   📏 Distância entre etiquetas: ${(ETIQUETA_CONFIG.altura / 28.3464567).toFixed(2)}cm`
  );

  if (larguraTotal > PAGINA_A4_PORTRAIT.largura) {
    console.warn("⚠️  ATENÇÃO: Largura excede os limites da página A4!");
  }

  if (alturaTotal > PAGINA_A4_PORTRAIT.altura) {
    console.warn("⚠️  ATENÇÃO: Altura excede os limites da página A4!");
  }
}

async function main() {
  try {
    console.log("=".repeat(60));
    console.log("🏷️  GERADOR DE ETIQUETAS A4363 - FOLHA RETRATO (CORRIGIDO)");
    console.log("📋 Especificações: 14 etiquetas (2x7) - 10x4cm cada");
    console.log("🎯 Layout: 1,5cm topo + 1cm + etiquetas com 4cm de distância");
    console.log("=".repeat(60));

    // Valida as configurações antes de iniciar
    validarConfiguracoes();

    const arquivoExcel = "empresas.xlsx";
    const dataAtual = new Date().toISOString().split("T")[0];
    const arquivoPDF = `etiquetas_a4363_toledo_corrigido_${dataAtual}.pdf`;

    // Verifica se o arquivo Excel existe
    if (!fs.existsSync(arquivoExcel)) {
      console.error(`❌ Arquivo ${arquivoExcel} não encontrado!`);
      console.log("💡 Certifique-se de que o arquivo esteja na mesma pasta do script.");
      process.exit(1);
    }

    const dados = lerPlanilha(arquivoExcel);

    if (dados.length === 0) {
      console.log("⚠️  Nenhum dado válido encontrado na planilha");
      console.log("💡 Verifique se as colunas estão preenchidas: nome, endereco, bairro, cep");
      return;
    }

    console.log("🚀 Iniciando geração do PDF...");
    criarPDF(dados, arquivoPDF);

    console.log("=".repeat(60));
    console.log("🎉 Processo concluído com sucesso!");
    console.log(`📁 Arquivo gerado: ${arquivoPDF}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Erro durante a execução:", error.message);
    console.error("🔍 Stack trace:", error.stack);
    process.exit(1);
  }
}

// Execução direta do script
if (require.main === module) {
  main();
}

// Exportações para uso como módulo
module.exports = {
  lerPlanilha,
  criarPDF,
  main,
  formatarTexto,
  validarConfiguracoes,
  ETIQUETA_CONFIG,
  PAGINA_A4_PORTRAIT,
};
