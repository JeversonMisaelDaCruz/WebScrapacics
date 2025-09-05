# WebScrapACICs - Documentação Oficial

## Sobre o Projeto

O **WebScrapACICs** é um sistema automatizado de coleta de dados (web scraping) desenvolvido para extrair informações de empresas associadas às **Associações Comerciais e Industriais (ACICs)** de diversas cidades do Paraná.

### Objetivo Principal

Automatizar a coleta de dados empresariais de múltiplas ACICs,:

- Nome da empresa
- Telefone de contato
- Endereço completo
- CEP
- Email (quando disponível)
- Cidade de origem

---

## ✨ Funcionalidades

### 🔧 Funcionalidades Principais

- ✅ **Scraping automatizado** de múltiplas ACICs
- ✅ **Execução seletiva** por cidade ou completa
- ✅ **Consolidação de dados** em formato JSON e Excel
- ✅ **Tratamento robusto de erros** e timeouts
- ✅ **Logs detalhados** do processo de extração
- ✅ **Rate limiting** para evitar sobrecarga dos servidores
- ✅ **Polyfills** para compatibilidade com Node.js 16
- ✅ **Estrutura modular** facilmente extensível

### 📊 Saídas de Dados

- **JSON**: Arquivo estruturado casa haja necessidades futuras
- **Excel (.xlsx)**: Planilha formatada com colunas organizadas

---

## 🛠️ Tecnologias Utilizadas

### Core Dependencies

```json
{
  "axios": "^1.x.x", // Requisições HTTP
  "cheerio": "^1.x.x", // Parser HTML (jQuery-like)
  "xlsx": "^0.x.x" // Geração de planilhas Excel
}
```

### Tecnologias de Desenvolvimento

- **Node.js 22**: Runtime JavaScript
- **ES6+ Modules**: Estrutura modular moderna
- **Async/Await**: Programação assíncrona
- **Error Handling**: Tratamento robusto de exceções
- **File System**: Manipulação de arquivos nativos

---

## 📁 Estrutura do Projeto

```
WebScrapACICs/
├── 📁 Cidades/                 # Diretório principal dos scrapers
│   ├── 📁 cafelandia/
│   │   └── script.js           # Scraper da ACICAF
│   ├── 📁 capitao/
│   │   └── scraper-acicap.js   # Scraper da ACICAP
│   ├── 📁 cascavel/
│   │   └── script.js           # Scraper da ACIC Cascavel
│   ├── 📁 ceuAzul/
│   │   └── script.js           # Scraper Céu Azul
│   ├── 📁 corbelia/
│   │   └── script.js           # Scraper da ACICORB
│   ├── 📁 guaraniacu/
│   │   └── script.js           # Scraper Guaraniaçu
│   ├── 📁 jesuitas/
│   │   └── script.js           # Scraper Jesuítas
│   ├── 📁 lindoOeste/
│   │   └── script.js           # Scraper da ACICLO
│   ├── 📁 marechal/
│   │   └── scrap-acicamar.js   # Scraper da ACIMACAR
│   ├── 📁 matelandia/
│   │   └── script.js           # Scraper da ACIMAT
│   ├── 📁 medianeira/
│   │   └── scraper.js          # Scraper da ACIME
│   ├── 📁 novaAurora/
│   │   └── script.js           # Scraper da ACINA
│   ├── 📁 santaHelena/
│   │   └── script.js           # Scraper da ACISASH
│   ├── 📁 santaTereza/
│   │   └── script.js           # Scraper da ACICTE
│   ├── 📁 toledo/
│   │   └── script.js           # Scraper da ACIT
│   └── 📁 tupassi/
│       └── script.js           # Scraper da ACITUP
├── 📁 results/                 # Diretório de saída (gerado automaticamente)
│   ├── empresas_consolidado_YYYY-MM-DD.json
│   └── empresas_consolidado_YYYY-MM-DD.xlsx
├── index.js                    # Arquivo principal de orquestração
├── package.json                # Dependências e scripts
├── package-lock.json           # Lock de versões
└── README.md                   # Este arquivo
```

### 🗂️ Padrões de Nomenclatura

- **Diretórios**: Nome da cidade em camelCase (ex: `santaHelena`)
- **Arquivos de Script**: Variam entre `script.js`, `scraper.js`, ou nomes específicos(padronizar para script.js futuramente)
- **Saídas**: Formato `empresas_consolidado_YYYY-MM-DD.{json|xlsx}`

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- **Node.js 22.x** (obrigatório para compatibilidade)
- **npm** ou **yarn**
- Conexão estável com a internet
- **macOS/Linux** recomendado (testado em macOS)

### 🚀 Instalação

1. **Clone o repositório:**

   ```bash
   git clone https://github.com/JeversonMisaelDaCruz/WebScrapacics.git
   cd WebScrapacics
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Verifique a instalação:**
   ```bash
   node index.js --help
   ```

### 🔧 Configuração

O projeto funciona **out-of-the-box** sem configurações adicionais. Os scrapers são auto-configuráveis e detectam automaticamente a estrutura de cada site.

---

## 🔄 Fluxo de Execução

O sistema segue um fluxo .

![Fluxo de Execução do WebScrapACICs](https://i.imgur.com/zhchBI6.png)

### Detalhamento do Fluxo

1. **🚀 Inicialização**: Carregamento dos módulos de scraping disponíveis
2. **✅ Verificação**: Teste de conectividade e validação da estrutura dos sites
3. **⚙️ Processamento**: Execução paralela dos scrapers selecionados
4. **📊 Coleta**: Extração sistemática de dados por categoria empresarial
5. **🔍 Detalhamento**: Busca de informações complementares de cada empresa
6. **📁 Consolidação**: Unificação de todos os resultados coletados
7. **💾 Exportação**: Geração automática de arquivos JSON e Excel com timestamp

---

## Como Usar

### Execução Completa (Todas as Cidades)

```bash
# Executa todos os scrapers disponíveis
node index.js
```

### 🏙️Execução Seletiva (Cidades Específicas)

```bash
# Uma cidade
node index.js cascavel

# Múltiplas cidades
node index.js cascavel toledo medianeira

```

---

## 🏘️Cidades Suportadas

| Cidade                       | Chave         | ACIC     | Status        | Observações               |
| ---------------------------- | ------------- | -------- | ------------- | ------------------------- |
| **Cafelândia**               | `cafelandia`  | ACICAF   | ✅ Ativo      | -                         |
| **Capitão Leônidas Marques** | `capitao`     | ACICAP   | ✅ Ativo      | -                         |
| **Cascavel**                 | `cascavel`    | ACIC     | ✅ Ativo      | Maior base de dados       |
| **Céu Azul**                 | `ceuazul`     | ACINA    | ✅ Ativo      | -                         |
| **Corbélia**                 | `corbelia`    | ACICORB  | ✅ Ativo      | -                         |
| **Guaraniaçu**               | `guaraniacu`  | -        | ✅ Ativo      | -                         |
| **Jesuítas**                 | `jesuitas`    | -        | ✅ Ativo      | -                         |
| **Lindo Oeste**              | `lindooeste`  | ACICLO   | ✅ Ativo      | -                         |
| **Marechal Cândido Rondon**  | `marechal`    | ACIMACAR | ✅ Ativo      | -                         |
| **Matelândia**               | `matelandia`  | ACIMAT   | ✅ Ativo      | -                         |
| **Medianeira**               | `medianeira`  | ACIME    | ✅ Ativo      | -                         |
| **Nova Aurora**              | `novaaurora`  | ACINA    | ✅ Ativo      | -                         |
| **Santa Helena**             | `santahelena` | ACISASH  | ✅ Ativo      | -                         |
| **Santa Tereza do Oeste**    | `santatereza` | ACICTE   | ⚠️ Em revisão |                           |
| **Toledo**                   | `toledo`      | ACIT     | ✅ Ativo      | -                         |
| **Tupãssi**                  | `tupassi`     | ACITUP   | ✅ Ativo      | -                         |

### 📈 Estatísticas

- **Total de Cidades**: 16
- **Cobertura Regional**: Oeste do Paraná

---
### 📄 Formato de Saída JSON

```json
[
  {
    "nome": "Empresa Exemplo Ltda",
    "telefone": "(45) 3123-4567",
    "endereco": "Rua das Flores, 123, Centro",
    "cep": "85123-456",
    "cidade": "Cascavel - PR",
    "email": "contato@empresaexemplo.com.br"
  }
]
```
### 📈 Formato Excel

- **Colunas**: Nome | Telefone | Endereço | CEP | Cidade | Email
- **Larguras**: Otimizadas automaticamente
- **Formatação**: Headers em negrito, dados centralizados

---

## 🏗️ Arquitetura do Sistema

### 🔧 Padrão de Implementação

Cada scraper segue um padrão arquitetural consistente:

```javascript
// Estrutura básica de um scraper
class CidadeScraper {
  constructor() {
    this.baseUrl = "URL_DA_ACIC";
    this.axiosConfig = {
      /* configurações */
    };
  }

  async iniciarScraping() {
    // Lógica principal de scraping
  }

  async processarCategoria(categoria) {
    // Processamento por categoria/seção
  }

  async coletarDetalhesEmpresa(url) {
    // Coleta detalhada de cada empresa
  }
}
```

### ⚡ Otimizações Implementadas

- **Rate Limiting**: 500ms entre requisições
- **Timeout Configurável**: 30s por requisição
- **Headers Otimizados**: User-Agent realístico
- **Error Recovery**: Tentativas múltiplas em caso de falha
- **Memory Management**: Limpeza automática de recursos

---

## 📋 Sistema de Logs

```bash
# Exemplo de saída de logs
Capitão carregado
Executando scraper para ACICAP (Capitão)...
Encontradas 12 categorias
Processando: Tech Solutions Ltda
ACICAP (Capitão) concluído. Total: 45 empresas.
```

---

## 🚀 Melhorias Futuras

### 🛠️ Melhorias Técnicas Imediatas

#### **Manutenibilidade**

- [ ] **TypeScript** migration
- [ ] **Sistema de Cache** para evitar re-scraping
- [ ] **ESLint + Prettier** configuration

#### **Monitoramento**

- [ ] **Error Tracking** (Sentry)

---

## 📖 Como Adicionar uma Nova Cidade

1. **Crie o diretório:**

   ```bash
   mkdir Cidades/nomeDaCidade
   ```

2. **Implemente o scraper:**

   ```javascript
   // Cidades/nomeDaCidade/script.js
   const axios = require("axios");
   const cheerio = require("cheerio");

   async function runNomeDaCidadeScraper() {
     // Implementação do scraper
     return empresas;
   }

   module.exports = runNomeDaCidadeScraper;
   ```

3. **Registre no index.js:**

   ```javascript
   const runNomeDaCidadeScraper = safeRequire("./nomeDaCidade/script");

   if (runNomeDaCidadeScraper) {
     AVAILABLE_CITIES.nomedacidade = {
       name: "ACIC (Nome da Cidade)",
       scraper: runNomeDaCidadeScraper,
     };
   }
   ```


