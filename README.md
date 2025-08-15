
# Web Scraping - Associações Comerciais (PR)

Este repositório contém **5 scripts independentes** para realizar web scraping nas Associações Comerciais das seguintes cidades do Paraná:

* **Toledo**
* **Capitão**
* **Marechal Cândido Rondon**
* **Santa Helena**
* **Corbélia**

Cada script foi desenvolvido para coletar dados de empresas associadas em cada cidade.

---

## 📂 Estrutura do Repositório

O repositório está organizado da seguinte forma:

```
/
├── toledo/
├── capitao/
├── marechal/
├── santa-helena/
└── corbelia/
```

Cada pasta contém:

* Código-fonte do web scraping
* `package.json` com dependências
* Scripts de execução

---

## 🚀 Como Executar

Cada script é independente.
Para executar, siga os passos abaixo para **cada cidade** que deseja rodar:

1. **Acesse a pasta da cidade**

   ```bash
   cd nome-da-cidade
   ```

   *(ex.: `cd toledo`)*

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Inicie o script**

   ```bash
   npm start
   ```

---

## ⚠️ Observações Importantes

* Certifique-se de ter o **Node.js** instalado (versão 22 ou superior recomendada).
* Alguns scripts podem demorar dependendo da quantidade de dados disponíveis no site da associação comercial.
* O uso do scraping deve respeitar os **termos de uso** e as **leis de proteção de dados**.

---

## 📜 Licença

Este projeto é de uso interno e não possui licença pública.
