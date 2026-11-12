/*
 * sumario.js — índice do livro.
 * Para adicionar, mover ou renomear um capítulo, edite só este arquivo.
 * t = título no menu | f = arquivo | cat = parte | sub = subcapítulo (recuado)
 * Obs.: os nomes dos arquivos não mudam; só a numeração exibida (a Parte II "A Máquina" usa ia00..ia08).
 */
const structure = [
    { t: "BOOT SEQUENCE", f: "introducao.html", cat: "INICIALIZAÇÃO" },

    // PARTE I
    { t: "01. O Cérebro Não é um Computador", f: "cap01.html", cat: "I. A MENTE" },
    { t: "02. Sequestro da Atenção", f: "cap02.html", cat: "I. A MENTE" },
    { t: "03. O Eu Inferido", f: "cap03.html", cat: "I. A MENTE" },

    // PARTE II — A MÁQUINA
    { t: "A Máquina: Nota de Método", f: "ia00.html", cat: "II. A MÁQUINA", sub: true },
    { t: "04. A Máquina de Prometer", f: "ia01.html", cat: "II. A MÁQUINA" },
    { t: "05. Como a Máquina Aprende", f: "ia02.html", cat: "II. A MÁQUINA" },
    { t: "06. Espelho e Papagaio", f: "ia03.html", cat: "II. A MÁQUINA" },
    { t: "07. Companheiros Sintéticos", f: "ia04.html", cat: "II. A MÁQUINA" },
    { t: "08. Quem Treina a Máquina", f: "ia05.html", cat: "II. A MÁQUINA" },
    { t: "09. A Corrida", f: "ia06.html", cat: "II. A MÁQUINA" },
    { t: "10. O Debate do Fim do Mundo", f: "ia07.html", cat: "II. A MÁQUINA" },
    { t: "11. Guerrilha com IA", f: "ia08.html", cat: "II. A MÁQUINA" },

    // PARTE III
    { t: "12. Necropolítica", f: "cap04.html", cat: "III. O CERCO" },
    { t: "13. Cidade Sensiente", f: "cap05.html", cat: "III. O CERCO" },
    { t: "14. Tribunal Algorítmico", f: "cap06.html", cat: "III. O CERCO" },
    { t: "14.1 Panóptico Financeiro", f: "cap06_1.html", cat: "III. O CERCO", sub: true },

    // PARTE IV
    { t: "15. Taylorismo Digital", f: "cap07.html", cat: "IV. INFRAESTRUTURA" },
    { t: "16. Internet Morta", f: "cap08.html", cat: "IV. INFRAESTRUTURA" },
    { t: "17. Geologia da Mídia", f: "cap09.html", cat: "IV. INFRAESTRUTURA" },
    { t: "17.1 Deepweb & Tor", f: "cap09_1.html", cat: "IV. INFRAESTRUTURA", sub: true },

    // PARTE V
    { t: "18. Neurodireitos", f: "cap10.html", cat: "V. RESISTÊNCIA" },
    { t: "18.1 Cibersegurança", f: "cap10_1.html", cat: "V. RESISTÊNCIA", sub: true },
    { t: "18.2 Cripto Economia", f: "cap10_2.html", cat: "V. RESISTÊNCIA", sub: true },

    { t: "19. Cidadania Onlife", f: "cap11.html", cat: "V. RESISTÊNCIA" },
    { t: "20. Tecnofeudalismo", f: "cap12.html", cat: "V. RESISTÊNCIA" },
    { t: "21. Solarpunk", f: "cap13.html", cat: "V. RESISTÊNCIA" },

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
    "ia00.html": "The Machine: A Note on Method",
    "ia01.html": "04. The Machine of Promises",
    "ia02.html": "05. How the Machine Learns",
    "ia03.html": "06. Mirror and Parrot",
    "ia04.html": "07. Synthetic Companions",
    "ia05.html": "08. Who Trains the Machine",
    "ia06.html": "09. The Race",
    "ia07.html": "10. The Doomsday Debate",
    "ia08.html": "11. Guerrilla with AI",
    "cap04.html": "12. Necropolitics",
    "cap05.html": "13. The Sentient City",
    "cap06.html": "14. Algorithmic Tribunal",
    "cap06_1.html": "14.1 Financial Panopticon",
    "cap07.html": "15. Digital Taylorism",
    "cap08.html": "16. Dead Internet",
    "cap09.html": "17. Geology of Media",
    "cap09_1.html": "17.1 Deep Web & Tor",
    "cap10.html": "18. Neurorights",
    "cap10_1.html": "18.1 Cybersecurity",
    "cap10_2.html": "18.2 Crypto Economy",
    "cap11.html": "19. Onlife Citizenship",
    "cap12.html": "20. Technofeudalism",
    "cap13.html": "21. Solarpunk",
    "cap14.html": "Epilogue",
    "cap15.html": "Glossary",
    "cap16.html": "Bibliography",
    "estatisticas.html": "Statistics"
};
const CATEGORIES_EN = {
    "INICIALIZAÇÃO": "INITIALIZATION",
    "I. A MENTE": "I. THE MIND",
    "II. A MÁQUINA": "II. THE MACHINE",
    "III. O CERCO": "III. THE SIEGE",
    "IV. INFRAESTRUTURA": "IV. INFRASTRUCTURE",
    "V. RESISTÊNCIA": "V. RESISTANCE",
    "SYSTEM END": "SYSTEM END",
    "DATABASE": "DATABASE"
};
