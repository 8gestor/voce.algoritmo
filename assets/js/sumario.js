/*
 * sumario.js — índice do livro.
 * Para adicionar, mover ou renomear um capítulo, edite só este arquivo.
 * t = título no menu | f = arquivo | cat = parte | sub = subcapítulo (recuado)
 */
const structure = [
    { t: "BOOT SEQUENCE", f: "introducao.html", cat: "INICIALIZAÇÃO" },
    
    // PARTE I
    { t: "01. O Cérebro Não é um Computador", f: "cap01.html", cat: "I. A MENTE" },
    { t: "02. Sequestro da Atenção", f: "cap02.html", cat: "I. A MENTE" },
    { t: "03. O Eu Inferido", f: "cap03.html", cat: "I. A MENTE" },

    // PARTE II
    { t: "04. Necropolítica", f: "cap04.html", cat: "II. O CERCO" },
    { t: "05. Cidade Sensiente", f: "cap05.html", cat: "II. O CERCO" },
    { t: "06. Tribunal Algorítmico", f: "cap06.html", cat: "II. O CERCO" },
    { t: "06.1 Panóptico Financeiro", f: "cap06_1.html", cat: "II. O CERCO", sub: true },

    // PARTE III
    { t: "07. Taylorismo Digital", f: "cap07.html", cat: "III. INFRAESTRUTURA" },
    { t: "08. Internet Morta", f: "cap08.html", cat: "III. INFRAESTRUTURA" },
    { t: "09. Geologia da Mídia", f: "cap09.html", cat: "III. INFRAESTRUTURA" },
    { t: "09.1 Deepweb & Tor", f: "cap09_1.html", cat: "III. INFRAESTRUTURA", sub: true },

    // PARTE IV
    { t: "10. Neurodireitos", f: "cap10.html", cat: "IV. RESISTÊNCIA" },
    { t: "10.1 Cibersegurança", f: "cap10_1.html", cat: "IV. RESISTÊNCIA", sub: true },
    { t: "10.2 Cripto Economia", f: "cap10_2.html", cat: "IV. RESISTÊNCIA", sub: true },
    
    { t: "11. Cidadania Onlife", f: "cap11.html", cat: "IV. RESISTÊNCIA" },
    { t: "12. Tecnofeudalismo", f: "cap12.html", cat: "IV. RESISTÊNCIA" },
    { t: "13. Solarpunk", f: "cap13.html", cat: "IV. RESISTÊNCIA" },

    // FINAL
    { t: "Epílogo", f: "cap14.html", cat: "SYSTEM END" },
    { t: "Glossário", f: "cap15.html", cat: "DATABASE" },
    { t: "Bibliografia", f: "cap16.html", cat: "DATABASE" },
    { t: "Estatísticas", f: "estatisticas.html", cat: "DATABASE" }
];

/* Títulos em inglês (usados quando o idioma de leitura é EN). Chave = arquivo. */
const TITLES_EN = {
    "introducao.html": "BOOT SEQUENCE",
    "cap01.html": "01. The Brain Is Not a Computer",
    "cap02.html": "02. Hijacking of Attention",
    "cap03.html": "03. The Inferred Self",
    "cap04.html": "04. Necropolitics",
    "cap05.html": "05. The Sentient City",
    "cap06.html": "06. Algorithmic Tribunal",
    "cap06_1.html": "06.1 Financial Panopticon",
    "cap07.html": "07. Digital Taylorism",
    "cap08.html": "08. Dead Internet",
    "cap09.html": "09. Geology of Media",
    "cap09_1.html": "09.1 Deep Web & Tor",
    "cap10.html": "10. Neurorights",
    "cap10_1.html": "10.1 Cybersecurity",
    "cap10_2.html": "10.2 Crypto Economy",
    "cap11.html": "11. Onlife Citizenship",
    "cap12.html": "12. Technofeudalism",
    "cap13.html": "13. Solarpunk",
    "cap14.html": "Epilogue",
    "cap15.html": "Glossary",
    "cap16.html": "Bibliography",
    "estatisticas.html": "Statistics"
};
const CATEGORIES_EN = {
    "INICIALIZAÇÃO": "INITIALIZATION",
    "I. A MENTE": "I. THE MIND",
    "II. O CERCO": "II. THE SIEGE",
    "III. INFRAESTRUTURA": "III. INFRASTRUCTURE",
    "IV. RESISTÊNCIA": "IV. RESISTANCE",
    "SYSTEM END": "SYSTEM END",
    "DATABASE": "DATABASE"
};