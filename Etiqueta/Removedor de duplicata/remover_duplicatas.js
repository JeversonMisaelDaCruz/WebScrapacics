const XLSX = require("xlsx");

// Nomes dos arquivos
const nomeArquivoEntrada = "empresas.xlsx";
const nomeArquivoSaida = "empresaajustado.xlsx";

console.log(`Lendo o arquivo: ${nomeArquivoEntrada}`);

try {
  // Lê o arquivo Excel
  const workbook = XLSX.readFile(nomeArquivoEntrada);

  // Pega a primeira aba da planilha
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Converte os dados da planilha para um array de objetos JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Total de linhas lidas: ${jsonData.length}`);

  // Cria um Set para armazenar strings de linhas únicas.
  // Isso remove duplicatas de linhas inteiras.
  const uniqueRows = new Set();
  const uniqueData = [];

  jsonData.forEach((row) => {
    // Converte o objeto da linha para uma string JSON para fácil comparação
    const rowString = JSON.stringify(row);
    if (!uniqueRows.has(rowString)) {
      uniqueRows.add(rowString);
      uniqueData.push(row);
    }
  });

  console.log(`Total de linhas únicas: ${uniqueData.length}`);
  console.log(`Duplicatas removidas: ${jsonData.length - uniqueData.length}`);

  // Cria uma nova planilha a partir dos dados únicos
  const newWorksheet = XLSX.utils.json_to_sheet(uniqueData);

  // Cria um novo workbook e adiciona a nova planilha
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

  // Salva o novo arquivo Excel
  XLSX.writeFile(newWorkbook, nomeArquivoSaida);

  console.log(`Arquivo ajustado salvo com sucesso como: ${nomeArquivoSaida}`);
  console.log("Operação concluída.");
} catch (error) {
  if (error.code === "ENOENT") {
    console.error(
      `Erro: Arquivo '${nomeArquivoEntrada}' não encontrado. Certifique-se de que ele está na mesma pasta do script.`
    );
  } else {
    console.error("Ocorreu um erro:", error);
  }
}
