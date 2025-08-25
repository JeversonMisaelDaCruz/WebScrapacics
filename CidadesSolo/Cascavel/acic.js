const cheerio = require("cheerio");
const fs = require("fs");
const page = fs.readFileSync("./acic.html");

const $ = cheerio.load(page);

const associados = [];

$("td.associado").each(function (i, elem) {
  associados.push({
    name: $(elem).find("h2").text().trim(),
    address: $(elem).find("p").text().trim(),
    phone: $(elem)
      .find("span")
      .text()
      .trim()
      .replace("Contato - ", "")
      .replace(/[^0-9]/g, ""),
    city: "Cascavel",
  });
});

associados.sort((a, b) => a.name.localeCompare(b.name));

const csv = [`"nome","cidade","endereco","telefone"`];

associados.forEach((item) => {
  if (!item.phone) {
    return false;
  }

  csv.push(`"${item.name}","${item.city}","${item.address}","55${item.phone}"`);
});

fs.writeFileSync("./associados.csv", csv.join("\n"));
