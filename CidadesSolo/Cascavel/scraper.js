const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const fs = require('fs');

class AcicvelScraper {
    constructor() {
        this.baseUrl = 'https://acicvel.com.br/associados';
        this.data = [];
        this.browser = null;
        this.page = null;
    }

    async init() {
        console.log('🚀 Iniciando o browser...');
        this.browser = await puppeteer.launch({
            headless: false, // Mude para true em produção
            defaultViewport: null,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        // Configurar headers para parecer um browser real
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Aguardar requisições de rede
        await this.page.setDefaultNavigationTimeout(30000);
    }

    async navigateToSite() {
        console.log('📍 Navegando para o site...');
        await this.page.goto(this.baseUrl, {
            waitUntil: 'networkidle0'
        });

        // Aguardar a tabela carregar
        await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
    }

    async extractAssociadosFromPage() {
        console.log('📊 Extraindo dados da página atual...');

        const associados = await this.page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            const data = [];

            rows.forEach(row => {
                const associadoElement = row.querySelector('.associado');
                if (associadoElement) {
                    // Extrair nome
                    const nameElement = associadoElement.querySelector('h2');
                    const nome = nameElement ? nameElement.textContent.trim() : '';

                    // Extrair endereço
                    const addressElement = associadoElement.querySelector('p');
                    const endereco = addressElement ? addressElement.textContent.trim() : '';

                    // Extrair contato
                    const contactElement = associadoElement.querySelector('span');
                    let contato = '';
                    if (contactElement) {
                        contato = contactElement.textContent.replace('Contato - ', '').trim();
                    }

                    if (nome) {
                        data.push({
                            nome: nome,
                            endereco: endereco,
                            contato: contato
                        });
                    }
                }
            });

            return data;
        });

        console.log(`✅ Extraídos ${associados.length} associados da página atual`);
        return associados;
    }

    async getTotalPages() {
        try {
            // Aguardar a paginação carregar
            await this.page.waitForSelector('.pagination', { timeout: 5000 });

            const totalPages = await this.page.evaluate(() => {
                const paginationItems = document.querySelectorAll('.pagination .page-item a.page-link');
                let maxPage = 1;

                paginationItems.forEach(item => {
                    const pageText = item.textContent.trim();
                    const pageNum = parseInt(pageText);
                    if (!isNaN(pageNum) && pageNum > maxPage) {
                        maxPage = pageNum;
                    }
                });

                return maxPage;
            });

            console.log(`📄 Total de páginas encontradas: ${totalPages}`);
            return totalPages;
        } catch (error) {
            console.log('⚠️  Não foi possível determinar o total de páginas, assumindo página única');
            return 1;
        }
    }

    async navigateToPage(pageNumber) {
        console.log(`🔄 Navegando para a página ${pageNumber}...`);

        try {
            // Tentar clicar no número da página
            const pageSelector = `.pagination a.page-link[data-dt-idx="${pageNumber}"]`;
            await this.page.waitForSelector(pageSelector, { timeout: 5000 });

            // Clicar e aguardar a nova página carregar
            await Promise.all([
                this.page.waitForResponse(response =>
                    response.url().includes('associados') && response.status() === 200
                ),
                this.page.click(pageSelector)
            ]);

            // Aguardar os dados carregarem
            await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
            await this.page.waitForTimeout(2000); // Aguardar um pouco mais para garantir

            return true;
        } catch (error) {
            console.log(`❌ Erro ao navegar para página ${pageNumber}:`, error.message);
            return false;
        }
    }

    async scrapeAllPages() {
        console.log('🔍 Iniciando scraping de todas as páginas...');

        // Extrair dados da primeira página
        let currentPageData = await this.extractAssociadosFromPage();
        this.data.push(...currentPageData);

        // Descobrir total de páginas
        const totalPages = await this.getTotalPages();

        // Navegar pelas páginas restantes
        for (let page = 2; page <= totalPages; page++) {
            const success = await this.navigateToPage(page);

            if (success) {
                currentPageData = await this.extractAssociadosFromPage();
                this.data.push(...currentPageData);

                console.log(`📈 Total acumulado: ${this.data.length} associados`);

                // Pequena pausa entre páginas para não sobrecarregar o servidor
                await this.page.waitForTimeout(1500);
            } else {
                console.log(`⚠️  Pulando página ${page} devido a erro`);
            }
        }

        console.log(`🎉 Scraping concluído! Total: ${this.data.length} associados`);
    }

    async saveToExcel() {
        console.log('💾 Salvando dados em Excel...');

        if (this.data.length === 0) {
            console.log('❌ Nenhum dado para salvar!');
            return;
        }

        // Criar workbook
        const wb = XLSX.utils.book_new();

        // Converter dados para planilha
        const ws = XLSX.utils.json_to_sheet(this.data);

        // Ajustar largura das colunas
        const colWidths = [
            { wch: 40 }, // Nome
            { wch: 50 }, // Endereço
            { wch: 20 }  // Contato
        ];
        ws['!cols'] = colWidths;

        // Adicionar planilha ao workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Associados');

        // Salvar arquivo
        const filename = `associados_acicvel_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);

        console.log(`✅ Arquivo salvo como: ${filename}`);

        // Salvar também como JSON backup
        const jsonFilename = filename.replace('.xlsx', '.json');
        fs.writeFileSync(jsonFilename, JSON.stringify(this.data, null, 2));
        console.log(`💾 Backup JSON salvo como: ${jsonFilename}`);
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log('🔚 Browser fechado');
        }
    }

    async run() {
        try {
            await this.init();
            await this.navigateToSite();
            await this.scrapeAllPages();
            await this.saveToExcel();
        } catch (error) {
            console.error('❌ Erro durante o scraping:', error);
        } finally {
            await this.close();
        }
    }

    // Método para filtrar e limpar dados
    cleanData() {
        console.log('🧹 Limpando dados...');

        this.data = this.data.filter(item =>
            item.nome && item.nome.length > 0
        ).map(item => ({
            nome: item.nome.toUpperCase().trim(),
            endereco: item.endereco.trim(),
            contato: this.cleanPhone(item.contato)
        }));

        // Remover duplicatas baseado no nome
        const seen = new Set();
        this.data = this.data.filter(item => {
            if (seen.has(item.nome)) {
                return false;
            }
            seen.add(item.nome);
            return true;
        });

        console.log(`🎯 Dados limpos: ${this.data.length} associados únicos`);
    }

    // Limpar formato do telefone
    cleanPhone(phone) {
        if (!phone) return '';

        // Remover caracteres especiais, manter apenas números
        const cleaned = phone.replace(/\D/g, '');

        // Formatar telefone brasileiro
        if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 3)} ${cleaned.substring(3, 7)}-${cleaned.substring(7)}`;
        } else if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        }

        return phone; // Retorna original se não conseguir formatar
    }

    // Método para scraping com retry em caso de erro
    async runWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Tentativa ${attempt}/${maxRetries}`);
                await this.run();
                this.cleanData();
                return;
            } catch (error) {
                console.error(`❌ Erro na tentativa ${attempt}:`, error.message);

                if (attempt < maxRetries) {
                    console.log(`⏳ Aguardando 10 segundos antes da próxima tentativa...`);
                    await new Promise(resolve => setTimeout(resolve, 10000));
                } else {
                    console.error('❌ Todas as tentativas falharam!');
                    throw error;
                }
            }
        }
    }
}

// Função principal para executar o scraper
async function main() {
    const scraper = new AcicvelScraper();
    await scraper.runWithRetry();
}

// Executar se for chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AcicvelScraper;