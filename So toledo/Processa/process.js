const fs = require("fs");
const csv = require("csv-parser");
const Excel = require("exceljs");

// 1. Defina o nome do arquivo de ENTRADA (o CSV que você salvou no Passo 1)
const inputFile = "empresas_para_processar.csv";

// 2. Defina o nome do arquivo de SAÍDA (será criado em formato Excel)
const outputFile = "empresas_processado_final.xlsx";
const results = [];

// Verifica se o arquivo de entrada existe antes de continuar
if (!fs.existsSync(inputFile)) {
  console.error(`\nERRO: O arquivo de entrada "${inputFile}" não foi encontrado!`);
  console.error(
    "Por favor, certifique-se de que você salvou o arquivo Excel como .csv e o colocou na pasta correta.\n"
  );
  process.exit(1); // Encerra o script
}

fs.createReadStream(inputFile)
  .pipe(csv())
  .on("data", (data) => {
    // Pega a coluna "Endereço" do seu CSV
    const enderecoCompleto = data["Endereço"] || "";

    // Variáveis para guardar os dados separados
    let enderecoLimpo = enderecoCompleto; // Valor padrão
    let cidade = "";
    let uf = "";

    // AQUI ESTÁ A LÓGICA DE SEPARAÇÃO CORRIGIDA
    // Procura pelo padrão " ... CEP: – CIDADE / UF"
    const match = enderecoCompleto.match(/(.*) CEP:.*– (.*) \/ (.*)/);

    if (match && match.length === 4) {
      // Se encontrar o padrão, separa os dados
      enderecoLimpo = match[1].trim(); // Pega tudo antes de "CEP:"
      cidade = match[2].trim(); // Pega a cidade
      uf = match[3].trim(); // Pega a UF
    }

    // Adiciona os dados organizados à lista de resultados
    results.push({
      Nome: data.Nome,
      Endereço: enderecoLimpo, // Endereço só até o bairro
      Cidade: cidade,
      UF: uf,
      CEP: data.CEP,
      Telefone: data.Telefone,
    });
  })
  .on("end", async () => {
    // --- Lógica para criar o arquivo .xlsx (Excel) ---
    const workbook = new Excel.Workbook();
    const worksheet = workbook.addWorksheet("Empresas");

    // Define os cabeçalhos das colunas no arquivo Excel
    worksheet.columns = [
      { header: "Nome", key: "Nome", width: 40 },
      { header: "Endereço", key: "Endereço", width: 50 },
      { header: "Cidade", key: "Cidade", width: 20 },
      { header: "UF", key: "UF", width: 10 },
      { header: "CEP", key: "CEP", width: 15 },
      { header: "Telefone", key: "Telefone", width: 20 },
    ];

    // Adiciona as linhas com os dados processados
    worksheet.addRows(results);

    // Salva o arquivo final .xlsx
    try {
      await workbook.xlsx.writeFile(outputFile);
      console.log(`\nArquivo "${outputFile}" criado com sucesso!`);
      console.log("Abra o novo arquivo Excel para ver os dados separados.\n");
    } catch (err) {
      console.error("Ocorreu um erro ao gerar o arquivo .xlsx:", err);
    }
  });
