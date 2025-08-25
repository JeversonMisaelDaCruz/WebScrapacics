const axios = require("axios");
const cheerio = require("cheerio");
const XLSX = require("xlsx");
const fs = require("fs");

// ===== Config =====
const BASE_URL = "https://www.acime.com.br";
const DEFAULT_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
};
const REQUEST_TIMEOUT_MS = 20000;
const DETAIL_TIMEOUT_MS = 15000;
const MAX_CONCURRENCY = 8; // limite de requisições simultâneas para páginas de detalhe

// ===== Util =====
function log(msg, type = "info") {
    const ts = new Date().toLocaleTimeString();
    const icon = { info: "ℹ️", success: "✅", error: "❌", warning: "⚠️", progress: "🔄" }[type] || "📝";
    console.log(`[${ts}] ${icon} ${msg}`);
}

function normalizeText(t) {
    return (t || "").replace(/\s+/g, " ").trim();
}

async function fetchHtml(url, { timeout = REQUEST_TIMEOUT_MS, retries = 2, headers = {} } = {}) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await axios.get(url, {
                headers: { ...DEFAULT_HEADERS, ...headers },
                timeout,
                responseType: 'text',
                transformResponse: (x) => x, // evita transformações inesperadas
                decompress: true,
                maxRedirects: 5,
            });
            return res.data;
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
    }
}

async function getAssociadosLinks(html) {
    const $ = cheerio.load(html);
    const linksSet = new Set();

    // Links “Ver Detalhes” para /associado/<slug>
    $("a[href*='/associado/']").each((_, a) => {
        let href = $(a).attr("href");
        if (!href) return;
        if (!href.startsWith("http")) href = BASE_URL + (href.startsWith("/") ? href : "/" + href);
        if (/\/associado\/[^\/]+$/.test(href)) linksSet.add(href);
    });

    const links = Array.from(linksSet).map((url) => ({ url }));
    log(`Encontrados ${links.length} links de associados`, "success");
    return links;
}

function extractPhonesFromText(text) {
    const phones = new Set();
    const phoneRegex = /(?:\(?\d{2}\)?\s*)?(?:9?\d{4})-?\d{4}/g; // (45) 99999-9999 / 9999-9999
    let m;
    while ((m = phoneRegex.exec(text)) !== null) {
        phones.add(m[0].replace(/\s+/g, " ").trim());
    }
    return Array.from(phones);
}

function extractCEPFromText(text) {
    const cepMatch = text.match(/\b\d{5}-\d{3}\b/);
    return cepMatch ? cepMatch[0] : null;
}

async function getAssociadoData(empresa, index, total) {
    try {
        log(`(${index}/${total}) Buscando: ${empresa.url}`, "progress");
        const html = await fetchHtml(empresa.url, { timeout: DETAIL_TIMEOUT_MS, headers: { Referer: BASE_URL + "/associados" } });

        // Debug: salvar HTML bruto para comparação quando necessário
        if (process.env.ACIME_DEBUG_HTML === '1') {
            const debugDir = __dirname + "/debug/html";
            try {
                if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
                // limita a 3 dumps por execução
                const counterFile = debugDir + "/.count";
                let count = 0;
                if (fs.existsSync(counterFile)) count = parseInt(fs.readFileSync(counterFile, 'utf8') || '0', 10) || 0;
                if (count < 3) {
                    const slug = empresa.url.split('/').pop();
                    const file = `${debugDir}/${String(count + 1).padStart(2, '0')}_${slug}.html`;
                    fs.writeFileSync(file, html);
                    fs.writeFileSync(counterFile, String(count + 1));
                    log(`HTML salvo para debug: ${file}`, 'warning');
                }
            } catch (e) {
                log(`Falha ao salvar HTML de debug: ${e.message}`, 'warning');
            }
        }
        const $ = cheerio.load(html, { decodeEntities: true, xmlMode: false });

        // Nome preferencial no ACIME
        let nome =
            normalizeText($(".box-titulo p").first().text()) ||
            normalizeText($("h1").first().text()) ||
            normalizeText($('meta[property="og:title"]').attr("content")) ||
            normalizeText($("title").text());

        const bodyText = normalizeText($("body").text());

        // Endereço e CEP: primeiro bloco de .media.dados-associado SEM ícones (sem .fa-*)
        let endereco = null;
        let cep = null;
        const addressBlock = $(".media.dados-associado").filter((_, el) => {
            const hasIcon = $(el).find(".fa, .fab, .fas").length > 0;
            return !hasIcon;
        }).first().find(".media-body");
        if (addressBlock.length) {
            const addrHtml = addressBlock.html() || "";
            const addrText = normalizeText(addrHtml.replace(/<br\s*\/?>(?!,)/gi, " "));
            cep = extractCEPFromText(addrText) || null;
            // remove CEP e sufixos de cidade do endereço
            let cleaned = addrText.replace(/\b\d{5}-\d{3}\b/, "");
            cleaned = cleaned.replace(/-\s*Medianeira\s*-\s*PR/i, "");
            endereco = normalizeText(cleaned);
            if (endereco && endereco.length < 8) endereco = null;
        }

        // Telefones: bloco com ícone .fa-phone e também botão WhatsApp
        const phoneSet = new Set();
        $(".media.dados-associado").each((_, el) => {
            if ($(el).find(".fa-phone").length) {
                const htmlPhones = $(el).find(".media-body").html() || "";
                const split = htmlPhones.split(/<br\s*\/?>(?!,)|[\n\r]/i).map(s => normalizeText(s)).filter(Boolean);
                split.forEach(s => extractPhonesFromText(s).forEach(p => phoneSet.add(p)));
            }
        });
        $("button.ver-mais-sidebar").each((_, btn) => {
            extractPhonesFromText($(btn).text()).forEach(p => phoneSet.add(p));
        });
        // Fallback: varre o body inteiro
        if (phoneSet.size === 0) extractPhonesFromText(bodyText).forEach(p => phoneSet.add(p));
        const telefone = Array.from(phoneSet).join(", ") || null;

        return {
            nome: nome || null,
            endereco,
            cep,
            telefone,
            cidade: "Medianeira",
            url: empresa.url
        };
    } catch (err) {
        log(`Erro ao buscar ${empresa.url}: ${err.message}`, "error");
        return {
            nome: null,
            endereco: null,
            cep: null,
            telefone: null,
            cidade: "Medianeira",
            url: empresa.url,
            erro: err.message
        };
    }
}

function saveToExcel(rows) {
    if (!rows || rows.length === 0) {
        log("Nenhum dado para salvar no Excel.", "error");
        return null;
    }
    const wb = XLSX.utils.book_new();
    // Ordena colunas em uma ordem consistente
    const ordered = rows.map((r) => ({
        nome: r.nome || "",
        endereco: r.endereco || "",
        cep: r.cep || "",
        telefone: r.telefone || "",
        cidade: r.cidade || "",
        url: r.url || "",
    }));
    const ws = XLSX.utils.json_to_sheet(ordered);
    ws["!cols"] = [
        { wch: 50 }, // nome
        { wch: 60 }, // endereco
        { wch: 10 }, // cep
        { wch: 25 }, // telefone
        { wch: 15 }, // cidade
        { wch: 60 }  // url
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Associados");
    const stamp = new Date().toISOString().split("T")[0];
    const filename = `acime_associados_${stamp}.xlsx`;
    XLSX.writeFile(wb, filename);
    log(`Excel salvo: ${filename}`, "success");
    return filename;
}

async function runAcimeScraper() {
    log("🚀 Iniciando web scraping da ACIME...");
    const url = BASE_URL + "/associados";
    try {
        const listHtml = await fetchHtml(url, { timeout: REQUEST_TIMEOUT_MS });
        const associadosLinks = await getAssociadosLinks(listHtml);
        if (associadosLinks.length === 0) {
            log("Nenhum associado encontrado na página inicial.", "error");
            return [];
        }

        const total = associadosLinks.length;
        const results = new Array(total);

        // Simple concurrency limiter
        let idx = 0;
        const workers = new Array(Math.min(MAX_CONCURRENCY, total)).fill(0).map(async () => {
            while (true) {
                const current = idx++;
                if (current >= total) break;
                const item = associadosLinks[current];
                results[current] = await getAssociadoData(item, current + 1, total);
            }
        });
        await Promise.all(workers);

        // Padroniza para o agregador (ordem das chaves não importa para JS, mas mantemos consistência)
        const standardized = results.map(r => ({
            nome: r.nome || null,
            telefone: r.telefone || null,
            endereco: r.endereco || null,
            cep: r.cep || null,
            cidade: r.cidade || "Medianeira",
        }));

        // Quando executado diretamente, salva Excel local desta cidade
        if (require.main === module) {
            saveToExcel(standardized);
            log(`✅ Scraping ACIME concluído! ${standardized.length} empresas processadas.`, "success");
        } else {
            log(`✅ Scraping ACIME concluído! ${standardized.length} empresas processadas.`, "success");
        }

        return standardized;
    } catch (err) {
        log(`❌ Erro fatal no scraping da ACIME: ${err.message}`, "error");
        return [];
    }
}

if (require.main === module) {
    runAcimeScraper().then(() => process.exit(0));
} else {
    module.exports = runAcimeScraper;
}