/*
 * trilha-conteudo.js — currículo da Trilha (dados puros, sem lógica).
 *
 * Cada missão segue o padrão do planejamento (ingles-do-zero/docs/02-niveis.md): objetivo → entrada (cena) → foco
 * (palavras e blocos) → notar (padrão) → prática → saída (falar e escrever). O motor (trilha-jogo.js) gera os exercícios
 * a partir destes dados: quem escreve conteúdo só preenche campos, não programa.
 *
 * Campos de uma missão
 *   teach     {pt,en}   fala curta do professor ao abrir a missão
 *   scene     [{who,en,pt}]   diálogo de entrada (ouvir, entender, repetir)
 *   focus     [{id,en,pt,tip?}]   5 a 8 blocos/palavras, sempre em contexto (a frase da cena)
 *   pattern   {title,discover:{q,options,answer,why},rule:[{pt,en}],table:[[en,pt]],contrast}   o que NOTAR
 *   build     [{pt,en:[variantes]}]   montar a frase com blocos
 *   cloze     [{en:'… ___ …',answer:[..],options:[..],pt,why}]   completar
 *   speak     [{en,pt,tip?}]   frases para repetir em voz alta
 *   write     {prompt,model,checks:[{re,miss,hit}],pass}   produção escrita guiada (checagem por regras)
 * Explicação: nos mundos iniciais em português; a cada mundo entra mais inglês (ver trilha-jogo.js, explain()).
 */
window.DD_CURRICULO = {
    worlds: [{
        id: 1, level: 'Pré-A1 → A1',
        name: { pt: 'Primeiros passos', en: 'First steps' },
        blurb: { pt: 'Cumprimentar, se apresentar, falar de idade, família, pedir algo com educação e contar o seu dia.', en: 'Greet, introduce yourself, talk about age, family, order politely and describe your day.' },
        missions: [
            {
                id: 'w1m1', n: 1, minutes: 10,
                title: { pt: 'Oi! Primeiras palavras e sons', en: 'Hi! First words and sounds' },
                goal: { pt: 'Cumprimentar, perguntar como a pessoa está, agradecer e se despedir.', en: 'Greet, ask how someone is, say thanks and goodbye.' },
                teach: {
                    pt: 'Vamos começar do jeito certo: com uma conversa de verdade. Ouça a cena, repare no que você já entende sozinho e só depois estude as peças. Você não precisa decorar nada: precisa notar.',
                    en: 'Let us start the right way: with a real conversation. Listen first, notice what you already understand, then study the pieces.'
                },
                scene: [
                    { who: 'Tom', en: 'Hi!', pt: 'Oi!' },
                    { who: 'Ana', en: 'Hello! Good morning.', pt: 'Olá! Bom dia.' },
                    { who: 'Tom', en: 'How are you?', pt: 'Como você está?' },
                    { who: 'Ana', en: "I'm fine, thanks. And you?", pt: 'Estou bem, obrigada. E você?' },
                    { who: 'Tom', en: 'Fine, thank you.', pt: 'Bem, obrigado.' },
                    { who: 'Ana', en: 'See you later. Bye!', pt: 'Até mais tarde. Tchau!' },
                    { who: 'Tom', en: 'Bye!', pt: 'Tchau!' }
                ],
                focus: [
                    { id: 'hello', en: 'Hello', pt: 'Olá', tip: '"Hi" é a versão curta e informal do "Hello".' },
                    { id: 'goodmorning', en: 'Good morning', pt: 'Bom dia', tip: 'Só até o meio-dia. À tarde: "Good afternoon". À noite: "Good evening".' },
                    { id: 'howareyou', en: 'How are you?', pt: 'Como você está?', tip: 'Na prática é um cumprimento: a resposta é curta e positiva.' },
                    { id: 'imfine', en: "I'm fine, thanks", pt: 'Estou bem, obrigado(a)', tip: "\"I'm\" é \"I am\" encurtado. Você vai ouvir isso o tempo todo." },
                    { id: 'thankyou', en: 'Thank you', pt: 'Obrigado(a)', tip: 'O "th" é feito com a ponta da língua entre os dentes, soprando. Não é "tank".' },
                    { id: 'please', en: 'Please', pt: 'Por favor', tip: 'Termina em /z/ ("pliiz"). Não coloque um "i" no fim.' },
                    { id: 'sorry', en: 'Sorry', pt: 'Desculpe', tip: 'Serve para pedir licença e para se desculpar.' },
                    { id: 'seeyoulater', en: 'See you later', pt: 'Até mais tarde', tip: 'Despedida informal. Em inglês não existe "obrigado" masculino ou feminino: é sempre "thank you".' }
                ],
                pattern: {
                    title: { pt: 'Sons que o português não tem', en: 'Sounds Portuguese does not have' },
                    discover: {
                        q: { pt: 'Ouça "thank you". Onde fica a língua no som "th"?', en: 'Listen to "thank you". Where is your tongue for the "th" sound?' },
                        options: ['Atrás dos dentes de cima, como no "t"', 'Entre os dentes, soprando o ar', 'Encostada no céu da boca, como no "r"'],
                        answer: 1,
                        why: { pt: 'Entre os dentes, com o ar passando. Esse som (/θ/) não existe no português, por isso brasileiros trocam por "t" ou "f". Treine devagar: língua para fora, sopra.', en: 'Between the teeth, with air flowing. This sound does not exist in Portuguese, so it needs practice.' }
                    },
                    rule: [
                        { pt: 'Palavras terminadas em consoante ficam "secas": please termina em /z/, não em "pliz-i". Não acrescente vogal no fim.', en: 'Words ending in a consonant stay "dry": please ends in /z/.' },
                        { pt: '"Thank you" não muda com o gênero de quem fala. O português diz obrigado/obrigada; o inglês diz sempre "thank you".', en: '"Thank you" never changes with gender.' }
                    ],
                    table: [['Hi / Hello', 'Oi / Olá'], ['Good morning', 'Bom dia'], ['Thanks / Thank you', 'Valeu / Obrigado(a)'], ['Bye / See you later', 'Tchau / Até mais']],
                    contrast: 'Cuidado: "Good night" é só despedida ("boa noite" ao sair). Ao chegar à noite, diz-se "Good evening".'
                },
                build: [
                    { pt: 'Até mais tarde.', en: ['See you later.', 'See you later'] },
                    { pt: 'Estou bem, obrigada.', en: ["I'm fine, thanks.", 'I am fine, thanks.', "I'm fine, thank you.", 'I am fine, thank you.'] },
                    { pt: 'Como você está?', en: ['How are you?'] }
                ],
                cloze: [
                    { en: 'Good ___!', answer: ['morning'], options: ['morning', 'please', 'sorry'], pt: 'Bom dia!', why: 'De manhã, "Good morning".' },
                    { en: '___ you! (obrigado)', answer: ['thank'], options: ['thank', 'sorry', 'later'], pt: 'Obrigado!', why: '"Thank you" = obrigado(a).' },
                    { en: 'See you ___.', answer: ['later'], options: ['later', 'morning', 'please'], pt: 'Até mais tarde.', why: '"See you later" = até mais tarde.' }
                ],
                speak: [
                    { en: 'Good morning! How are you?', pt: 'Bom dia! Como você está?', tip: 'Una "how are you" em um fluxo só: "how-are-you".' },
                    { en: "I'm fine, thanks. And you?", pt: 'Estou bem, obrigado(a). E você?', tip: 'A voz sobe no "you" final, porque é pergunta.' },
                    { en: 'See you later. Bye!', pt: 'Até mais tarde. Tchau!' }
                ],
                write: {
                    prompt: { pt: 'Escreva, em inglês, como você cumprimentaria alguém de manhã e perguntaria como a pessoa está.', en: 'Write how you would greet someone in the morning and ask how they are.' },
                    model: 'Good morning! How are you?',
                    checks: [
                        { re: '\\b(good morning|hello|hi)\\b', miss: 'Falta o cumprimento (Hello / Hi / Good morning).', hit: 'Cumprimento ok.' },
                        { re: '\\bhow are you\\b', miss: 'Falta perguntar "How are you?".', hit: 'Pergunta ok.' }
                    ],
                    pass: 2
                }
            },
            {
                id: 'w1m2', n: 2, minutes: 12,
                title: { pt: 'Quem sou eu: verbo to be', en: 'Who am I: the verb to be' },
                goal: { pt: 'Dizer seu nome e de onde você é, e perguntar o mesmo à outra pessoa.', en: 'Say your name and where you are from, and ask the same.' },
                teach: {
                    pt: 'Agora a peça mais importante do inglês: o verbo to be. Ele cobre "ser" e "estar" ao mesmo tempo. Com ele você já se apresenta e já pergunta.',
                    en: 'Now the most important piece of English: the verb to be. It covers both "ser" and "estar".'
                },
                scene: [
                    { who: 'Leo', en: "Hi, I'm Leo. What's your name?", pt: 'Oi, eu sou o Leo. Qual é o seu nome?' },
                    { who: 'Ana', en: 'My name is Ana. Nice to meet you.', pt: 'Meu nome é Ana. Prazer em conhecer você.' },
                    { who: 'Leo', en: 'Nice to meet you too. Are you from Brazil?', pt: 'Prazer também. Você é do Brasil?' },
                    { who: 'Ana', en: "Yes, I am. I'm from São Paulo. And you?", pt: 'Sim, sou. Sou de São Paulo. E você?' },
                    { who: 'Leo', en: "I'm from Portugal.", pt: 'Sou de Portugal.' }
                ],
                focus: [
                    { id: 'whatsyourname', en: "What's your name?", pt: 'Qual é o seu nome?', tip: '"What\'s" é "What is" encurtado.' },
                    { id: 'mynameis', en: 'My name is…', pt: 'Meu nome é…', tip: 'Também vale só "I\'m Ana".' },
                    { id: 'nicetomeetyou', en: 'Nice to meet you', pt: 'Prazer em conhecer você', tip: 'Se a outra pessoa disser primeiro, responda "Nice to meet you too".' },
                    { id: 'iam', en: 'I am', pt: 'Eu sou / eu estou', tip: 'Sempre com o "I" na frente. Nunca só "am".' },
                    { id: 'youare', en: 'You are', pt: 'Você é / você está', tip: 'Fica "you\'re" na fala rápida.' },
                    { id: 'areyoufrom', en: 'Are you from…?', pt: 'Você é de…?', tip: 'Em pergunta, o verbo vem antes: "Are you…?", não "You are…?".' },
                    { id: 'yesiam', en: 'Yes, I am', pt: 'Sim, sou', tip: 'Resposta curta: repete o verbo. "Yes, I am." / "No, I am not."' },
                    { id: 'imfrom', en: "I'm from…", pt: 'Eu sou de…', tip: 'Origem usa "from": I\'m from Brazil.' }
                ],
                pattern: {
                    title: { pt: 'Verbo to be: eu sou, você é', en: 'The verb to be: I am, you are' },
                    discover: {
                        q: { pt: 'Complete: "I ___ from Brazil." Qual palavra o inglês usa?', en: 'Complete: "I ___ from Brazil."' },
                        options: ['am', 'is', 'are'],
                        answer: 0,
                        why: { pt: 'Com "I" é "am". A tabela completa: I am · you are · he/she/it is · we/they are. Você já viu "am" e "are" na cena.', en: 'With "I" it is "am".' }
                    },
                    rule: [
                        { pt: 'O sujeito é obrigatório em inglês: "I am Ana", nunca só "am Ana". O português pode dizer "Sou Ana", o inglês não.', en: 'The subject is required: "I am Ana".' },
                        { pt: 'Para perguntar, troque a ordem: "You are from Brazil" → "Are you from Brazil?".', en: 'To ask, swap the order.' },
                        { pt: 'Forma curta na fala: I am → I\'m · you are → you\'re. Escrever "I\'m" é natural, não é informal demais.', en: 'Short forms: I\'m, you\'re.' }
                    ],
                    table: [['I am (I\'m)', 'eu sou/estou'], ['You are (you\'re)', 'você é/está'], ['Am I…? / Are you…?', 'Eu sou…? / Você é…?']],
                    contrast: 'O português tem "ser" e "estar". Em inglês, "I am tired" (estou cansado) e "I am Ana" (sou Ana) usam o mesmo verbo: o sentido vem do contexto.'
                },
                build: [
                    { pt: 'Meu nome é Ana.', en: ['My name is Ana.'] },
                    { pt: 'Você é do Brasil?', en: ['Are you from Brazil?'] },
                    { pt: 'Eu sou de São Paulo.', en: ["I'm from São Paulo.", 'I am from São Paulo.', "I'm from Sao Paulo.", 'I am from Sao Paulo.'] }
                ],
                cloze: [
                    { en: 'I ___ from Brazil.', answer: ['am'], options: ['am', 'is', 'are'], pt: 'Eu sou do Brasil.', why: 'I → am.' },
                    { en: '___ you from Portugal?', answer: ['are'], options: ['Are', 'Is', 'Am'], pt: 'Você é de Portugal?', why: 'Pergunta com you: Are you…?' },
                    { en: 'My ___ is Leo.', answer: ['name'], options: ['name', 'from', 'meet'], pt: 'Meu nome é Leo.', why: '"My name is…" é o jeito padrão.' }
                ],
                speak: [
                    { en: 'My name is Ana. Nice to meet you.', pt: 'Meu nome é Ana. Prazer em conhecer você.', tip: '"Nice to" sai quase como uma palavra só.' },
                    { en: 'Are you from Brazil?', pt: 'Você é do Brasil?', tip: 'A voz sobe no fim da pergunta.' },
                    { en: "Yes, I am. I'm from São Paulo.", pt: 'Sim, sou. Sou de São Paulo.' }
                ],
                write: {
                    prompt: { pt: 'Apresente-se em inglês: diga seu nome e de onde você é.', en: 'Introduce yourself: say your name and where you are from.' },
                    model: "My name is Sam. I'm from Brazil.",
                    checks: [
                        { re: "\\b(my name is|i am|i'm)\\b", miss: 'Falta dizer o nome (My name is… ou I\'m…).', hit: 'Nome ok.' },
                        { re: '\\bfrom\\b', miss: 'Falta dizer de onde você é (…from…).', hit: 'Origem ok.' }
                    ],
                    pass: 2
                }
            },
            {
                id: 'w1m3', n: 3, minutes: 12,
                title: { pt: 'Números e idade', en: 'Numbers and age' },
                goal: { pt: 'Contar de 0 a 20, dizer sua idade e passar um número de telefone.', en: 'Count 0–20, say your age and give a phone number.' },
                teach: {
                    pt: 'Números são úteis desde o primeiro dia. E tem uma armadilha clássica: em inglês você não "tem" anos, você "é" anos. Vamos notar isso na cena.',
                    en: 'Numbers are useful from day one. And there is a classic trap: in English you "are" years old, you do not "have" years.'
                },
                scene: [
                    { who: 'Leo', en: 'How old are you, Ana?', pt: 'Quantos anos você tem, Ana?' },
                    { who: 'Ana', en: "I'm twenty-eight years old.", pt: 'Eu tenho vinte e oito anos.' },
                    { who: 'Leo', en: "Really? I'm twenty-eight too!", pt: 'Sério? Eu também tenho vinte e oito!' },
                    { who: 'Ana', en: "What's your phone number?", pt: 'Qual é o seu número de telefone?' },
                    { who: 'Leo', en: "It's five five five, two one zero.", pt: 'É cinco cinco cinco, dois um zero.' }
                ],
                focus: [
                    { id: 'num1_5', en: 'one, two, three, four, five', pt: 'um, dois, três, quatro, cinco', tip: '"Four" e "five": o "f" é com os dentes no lábio de baixo.' },
                    { id: 'num6_10', en: 'six, seven, eight, nine, ten', pt: 'seis, sete, oito, nove, dez', tip: '"Nine" rima com "mine".' },
                    { id: 'zero', en: 'zero', pt: 'zero', tip: 'No telefone também se diz "oh": "five oh one".' },
                    { id: 'twenty', en: 'twenty', pt: 'vinte', tip: '-teen vs -ty: thirteen (acento no fim) ≠ thirty (acento no início). Ouça a diferença.' },
                    { id: 'howoldareyou', en: 'How old are you?', pt: 'Quantos anos você tem?', tip: 'Literalmente "quão velho é você?".' },
                    { id: 'yearsold', en: 'years old', pt: 'anos (de idade)', tip: '"years old" costuma ser dito, mas pode sumir: "I\'m twenty-eight."' },
                    { id: 'phonenumber', en: 'phone number', pt: 'número de telefone', tip: 'Números de telefone são ditos dígito a dígito.' }
                ],
                pattern: {
                    title: { pt: 'Idade: eu sou, não eu tenho', en: 'Age: I am, not I have' },
                    discover: {
                        q: { pt: 'Como se diz "Eu tenho 20 anos" em inglês?', en: 'How do you say "Eu tenho 20 anos"?' },
                        options: ['I have twenty years.', 'I am twenty years old.', 'I tenho twenty years.'],
                        answer: 1,
                        why: { pt: 'Em inglês a idade usa o verbo to be: "I am twenty (years old)". "I have twenty years" soa estranho e é um erro muito comum entre brasileiros.', en: 'In English, age uses to be: "I am twenty".' }
                    },
                    rule: [
                        { pt: 'Idade = to be + número (+ years old). "I am 30." / "She is 12."', en: 'Age = to be + number.' },
                        { pt: 'Pergunta: "How old are you?" (e não "How many years do you have?").', en: 'Ask with "How old are you?".' },
                        { pt: 'Números compostos: twenty-eight (hífen). De 13 a 19 terminam em -teen; 20, 30, 40 terminam em -ty.', en: 'Compound numbers use a hyphen.' }
                    ],
                    table: [['I am 28.', 'Eu tenho 28.'], ['How old are you?', 'Quantos anos você tem?'], ['thirteen / thirty', '13 / 30 (acento diferente)']],
                    contrast: 'Português: ter + anos. Inglês: ser + idade. Mesmo padrão vale para fome e sede em inglês ("I am hungry", não "I have hunger").'
                },
                build: [
                    { pt: 'Quantos anos você tem?', en: ['How old are you?'] },
                    { pt: 'Eu tenho vinte anos.', en: ['I am twenty years old.', "I'm twenty years old.", 'I am twenty.', "I'm twenty."] },
                    { pt: 'Qual é o seu número de telefone?', en: ["What's your phone number?", 'What is your phone number?'] }
                ],
                cloze: [
                    { en: 'I ___ twenty years old.', answer: ['am'], options: ['am', 'have', 'is'], pt: 'Eu tenho vinte anos.', why: 'Idade usa to be: I am.' },
                    { en: 'How ___ are you?', answer: ['old'], options: ['old', 'many', 'years'], pt: 'Quantos anos você tem?', why: '"How old are you?" é a pergunta padrão.' },
                    { en: "What's your phone ___?", answer: ['number'], options: ['number', 'name', 'old'], pt: 'Qual é o seu número de telefone?', why: 'phone number.' }
                ],
                speak: [
                    { en: 'How old are you?', pt: 'Quantos anos você tem?' },
                    { en: "I'm twenty-eight years old.", pt: 'Eu tenho vinte e oito anos.', tip: '"twenty" tem o acento no começo: TWEN-ty.' },
                    { en: 'five five five, two one zero', pt: '555, 210', tip: 'Fale dígito a dígito, em ritmo constante.' }
                ],
                write: {
                    prompt: { pt: 'Diga sua idade em inglês, em uma frase completa.', en: 'Say your age in English, in a full sentence.' },
                    model: 'I am thirty years old.',
                    checks: [
                        { re: "\\b(i am|i'm)\\b", miss: 'Use "I am" ou "I\'m" (não "I have").', hit: 'Verbo certo: to be.' },
                        { re: '\\b(\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\\b', miss: 'Falta o número da idade.', hit: 'Número ok.' }
                    ],
                    pass: 2
                }
            },
            {
                id: 'w1m4', n: 4, minutes: 12,
                title: { pt: 'Ele, ela e a família', en: 'He, she and family' },
                goal: { pt: 'Apresentar pessoas da família usando he is, she is, they are e we are.', en: 'Introduce family members with he is, she is, they are, we are.' },
                teach: {
                    pt: 'Agora o verbo to be ganha mais três formas. É o mesmo verbo, só muda conforme quem fala. E você vai falar da sua família, que é um tema que ninguém esquece.',
                    en: 'Now to be gets three more forms. Same verb, it just changes with the subject.'
                },
                scene: [
                    { who: 'Ana', en: 'This is my family.', pt: 'Esta é a minha família.' },
                    { who: 'Ana', en: 'He is my brother, Pedro.', pt: 'Ele é meu irmão, Pedro.' },
                    { who: 'Ana', en: 'She is my mother. Her name is Rita.', pt: 'Ela é minha mãe. O nome dela é Rita.' },
                    { who: 'Leo', en: 'Are they from São Paulo?', pt: 'Eles são de São Paulo?' },
                    { who: 'Ana', en: 'Yes, they are. We are a big family!', pt: 'Sim, são. Somos uma família grande!' }
                ],
                focus: [
                    { id: 'family', en: 'family', pt: 'família', tip: 'Acento na primeira sílaba: FA-mi-ly.' },
                    { id: 'brother', en: 'brother', pt: 'irmão', tip: 'O "th" de novo, mas agora vozeado (a garganta vibra).' },
                    { id: 'sister', en: 'sister', pt: 'irmã' },
                    { id: 'mother', en: 'mother', pt: 'mãe', tip: '"mother" e "father" têm o mesmo "th" vibrante.' },
                    { id: 'heis', en: 'He is', pt: 'Ele é / ele está', tip: 'Para pessoas do sexo masculino. Para coisas: "it is".' },
                    { id: 'sheis', en: 'She is', pt: 'Ela é / ela está' },
                    { id: 'theyare', en: 'They are', pt: 'Eles/elas são', tip: '"They" serve para eles e para elas.' },
                    { id: 'weare', en: 'We are', pt: 'Nós somos / estamos', tip: 'Na fala: "we\'re".' }
                ],
                pattern: {
                    title: { pt: 'Verbo to be completo', en: 'The full verb to be' },
                    discover: {
                        q: { pt: 'Complete: "She ___ my mother."', en: 'Complete: "She ___ my mother."' },
                        options: ['am', 'is', 'are'],
                        answer: 1,
                        why: { pt: 'He, she e it usam "is". Eu: am. Você, nós, eles: are. São só três palavras: am, is, are.', en: 'He, she, it use "is".' }
                    },
                    rule: [
                        { pt: 'I → am · you/we/they → are · he/she/it → is. Só três formas: am, is, are.', en: 'I am · you/we/they are · he/she/it is.' },
                        { pt: '"It" é para coisas e animais; "he" e "she" para pessoas: "It is a dog." / "She is a doctor."', en: '"It" is for things.' },
                        { pt: 'Posse: my (meu/minha), your (seu), his (dele), her (dela). "Her name is Rita" = o nome dela é Rita.', en: 'Possessives: my, your, his, her.' }
                    ],
                    table: [['I am', 'eu sou'], ['You are', 'você é'], ['He / She / It is', 'ele / ela / isso é'], ['We are', 'nós somos'], ['They are', 'eles/elas são']],
                    contrast: 'Em português o gênero aparece no artigo e no adjetivo ("minha mãe"). Em inglês "my" é igual para tudo: my brother, my mother.'
                },
                build: [
                    { pt: 'Ela é minha mãe.', en: ['She is my mother.', "She's my mother."] },
                    { pt: 'Eles são meus amigos.', en: ['They are my friends.', "They're my friends."] },
                    { pt: 'Nós somos uma família grande.', en: ['We are a big family.', "We're a big family."] }
                ],
                cloze: [
                    { en: 'He ___ my brother.', answer: ['is'], options: ['is', 'am', 'are'], pt: 'Ele é meu irmão.', why: 'He → is.' },
                    { en: 'We ___ a big family.', answer: ['are'], options: ['are', 'is', 'am'], pt: 'Somos uma família grande.', why: 'We → are.' },
                    { en: '___ name is Rita. (dela)', answer: ['her'], options: ['Her', 'His', 'My'], pt: 'O nome dela é Rita.', why: 'Her = dela.' }
                ],
                speak: [
                    { en: 'This is my family.', pt: 'Esta é a minha família.' },
                    { en: 'She is my mother. Her name is Rita.', pt: 'Ela é minha mãe. O nome dela é Rita.', tip: '"mother" tem o "th" vibrante: a garganta vibra.' },
                    { en: 'Yes, they are. We are a big family!', pt: 'Sim, são. Somos uma família grande!' }
                ],
                write: {
                    prompt: { pt: 'Escreva duas frases sobre uma pessoa da sua família (quem é e como se chama).', en: 'Write two sentences about a family member (who it is and their name).' },
                    model: 'He is my brother. His name is Pedro.',
                    checks: [
                        { re: '\\b(he is|she is|they are|he\'s|she\'s|they\'re)\\b', miss: 'Falta he is / she is / they are.', hit: 'Verbo to be ok.' },
                        { re: '\\b(my|his|her)\\b', miss: 'Use my / his / her para indicar de quem é.', hit: 'Possessivo ok.' },
                        { re: '\\b(brother|sister|mother|father|mom|dad|friend|family|son|daughter|wife|husband|grandmother|grandfather)\\b', miss: 'Diga quem é (brother, sister, mother...).', hit: 'Parentesco ok.' }
                    ],
                    pass: 2
                }
            },
            {
                id: 'w1m5', n: 5, minutes: 12,
                title: { pt: 'Pedir com educação', en: 'Ordering politely' },
                goal: { pt: 'Pedir algo para beber e perguntar o preço de forma educada.', en: 'Order a drink and ask the price politely.' },
                teach: {
                    pt: 'Falar certo não é só gramática: é soar educado. Um "I want" pode parecer ríspido; "I\'d like" abre portas. Vamos pedir um café como nativos.',
                    en: 'Speaking well is also about sounding polite. "I want" can sound rude; "I\'d like" opens doors.'
                },
                scene: [
                    { who: 'Waiter', en: 'Hello! What would you like?', pt: 'Olá! O que você gostaria?' },
                    { who: 'Ana', en: "I'd like a coffee, please.", pt: 'Eu gostaria de um café, por favor.' },
                    { who: 'Waiter', en: 'Anything else?', pt: 'Mais alguma coisa?' },
                    { who: 'Ana', en: 'Can I have a glass of water, please?', pt: 'Posso pegar um copo de água, por favor?' },
                    { who: 'Waiter', en: 'Of course. Here you are.', pt: 'Claro. Aqui está.' },
                    { who: 'Ana', en: 'Thank you! How much is it?', pt: 'Obrigada! Quanto custa?' },
                    { who: 'Waiter', en: "It's five dollars.", pt: 'São cinco dólares.' }
                ],
                focus: [
                    { id: 'idlike', en: "I'd like…", pt: 'Eu gostaria de…', tip: '"I\'d" é "I would". Pedido educado.' },
                    { id: 'canihave', en: 'Can I have…?', pt: 'Posso pegar/ter…?', tip: 'Muito comum para pedir algo em lojas e restaurantes.' },
                    { id: 'acoffee', en: 'a coffee', pt: 'um café', tip: 'Antes de som de consoante: "a". Antes de vogal: "an" (an apple).' },
                    { id: 'glassofwater', en: 'a glass of water', pt: 'um copo de água' },
                    { id: 'anythingelse', en: 'Anything else?', pt: 'Mais alguma coisa?' },
                    { id: 'hereyouare', en: 'Here you are', pt: 'Aqui está / tome', tip: 'Quando você entrega algo a alguém.' },
                    { id: 'howmuch', en: 'How much is it?', pt: 'Quanto custa?' },
                    { id: 'ofcourse', en: 'Of course', pt: 'Claro / com certeza' }
                ],
                pattern: {
                    title: { pt: 'Pedir sem soar ríspido', en: 'Asking without sounding rude' },
                    discover: {
                        q: { pt: 'Qual frase é a mais educada para pedir um café?', en: 'Which sentence is the most polite way to ask for a coffee?' },
                        options: ['I want coffee.', "I'd like a coffee, please.", 'Give me coffee.'],
                        answer: 1,
                        why: { pt: '"I\'d like… please" é o padrão educado. "I want" não é errado, mas soa direto demais. "Give me" soa como ordem.', en: '"I\'d like… please" is the polite standard.' }
                    },
                    rule: [
                        { pt: 'Pedido educado: I\'d like + algo + please, ou Can I have + algo + please?', en: 'Polite: I\'d like… please / Can I have… please?' },
                        { pt: 'Artigo a/an: "a coffee", "an apple". Usa-se "an" antes de som de vogal.', en: 'a / an.' },
                        { pt: '"Please" no fim soa natural; no começo também: "Please, can I have…?".', en: '"Please" at the end sounds natural.' }
                    ],
                    table: [["I'd like a coffee.", 'Eu gostaria de um café.'], ['Can I have water?', 'Posso pegar água?'], ['a coffee / an apple', 'um café / uma maçã']],
                    contrast: 'Em português "eu queria um café" já é educado (o "queria" amacia). Em inglês isso equivale a "I\'d like" e não a "I want".'
                },
                build: [
                    { pt: 'Eu gostaria de um café, por favor.', en: ["I'd like a coffee, please.", 'I would like a coffee, please.'] },
                    { pt: 'Posso pegar um copo de água, por favor?', en: ['Can I have a glass of water, please?'] },
                    { pt: 'Quanto custa?', en: ['How much is it?'] }
                ],
                cloze: [
                    { en: "I'd ___ a tea, please.", answer: ['like'], options: ['like', 'want', 'have'], pt: 'Eu gostaria de um chá, por favor.', why: "I'd like." },
                    { en: 'Can I ___ some water, please?', answer: ['have'], options: ['have', 'like', 'is'], pt: 'Posso pegar água, por favor?', why: 'Can I have…?' },
                    { en: 'Here you ___.', answer: ['are'], options: ['are', 'is', 'am'], pt: 'Aqui está.', why: 'Here you are.' }
                ],
                speak: [
                    { en: "I'd like a coffee, please.", pt: 'Eu gostaria de um café, por favor.', tip: '"I\'d like a" sai ligado: "I-d-like-a".' },
                    { en: 'Can I have a glass of water, please?', pt: 'Posso pegar um copo de água, por favor?' },
                    { en: 'Thank you! How much is it?', pt: 'Obrigada! Quanto custa?' }
                ],
                write: {
                    prompt: { pt: 'Peça uma bebida em um café, com educação.', en: 'Order a drink in a café, politely.' },
                    model: "I'd like a coffee, please.",
                    checks: [
                        { re: "\\b(i'd like|i would like|can i have|could i have)\\b", miss: 'Use I\'d like… ou Can I have… para pedir.', hit: 'Pedido educado ok.' },
                        { re: '\\bplease\\b', miss: 'Falta o "please".', hit: '"Please" ok.' }
                    ],
                    pass: 2
                }
            },
            {
                id: 'w1m6', n: 6, minutes: 14,
                title: { pt: 'Meu dia: presente simples', en: 'My day: present simple' },
                goal: { pt: 'Falar do que você faz, onde mora e do que gosta, e dizer o que não faz.', en: 'Talk about what you do, where you live and like, and what you do not do.' },
                teach: {
                    pt: 'Este é o tempo verbal dos hábitos e dos fatos: o presente simples. A boa notícia: em inglês o verbo quase não muda. A única mudança está no ele/ela, e é um S.',
                    en: 'This is the tense for habits and facts: the present simple. The verb almost never changes. Only he/she/it add an S.'
                },
                scene: [
                    { who: 'Leo', en: 'What do you do?', pt: 'O que você faz (da vida)?' },
                    { who: 'Ana', en: 'I work in a school. I teach English.', pt: 'Eu trabalho em uma escola. Eu ensino inglês.' },
                    { who: 'Leo', en: 'Where do you live?', pt: 'Onde você mora?' },
                    { who: 'Ana', en: 'I live in São Paulo. I like my city.', pt: 'Eu moro em São Paulo. Eu gosto da minha cidade.' },
                    { who: 'Leo', en: 'Do you work on Saturdays?', pt: 'Você trabalha aos sábados?' },
                    { who: 'Ana', en: "No, I don't. My brother works on Saturdays.", pt: 'Não. Meu irmão trabalha aos sábados.' }
                ],
                focus: [
                    { id: 'iwork', en: 'I work', pt: 'Eu trabalho', tip: 'Verbo no "formato de dicionário", sem mudar.' },
                    { id: 'ilive', en: 'I live', pt: 'Eu moro', tip: '"live" aqui rima com "give".' },
                    { id: 'ilike', en: 'I like', pt: 'Eu gosto de' },
                    { id: 'iteach', en: 'I teach', pt: 'Eu ensino' },
                    { id: 'whatdoyoudo', en: 'What do you do?', pt: 'O que você faz (da vida)?', tip: 'Pergunta sobre profissão. O primeiro "do" é o auxiliar; o segundo é o verbo.' },
                    { id: 'wheredoyoulive', en: 'Where do you live?', pt: 'Onde você mora?' },
                    { id: 'doyou', en: 'Do you…?', pt: 'Você… ? (pergunta)', tip: 'Para perguntar no presente simples: Do + sujeito + verbo.' },
                    { id: 'idont', en: "I don't", pt: 'Eu não…', tip: '"don\'t" = do not. Depois dele o verbo fica sem S: I don\'t work.' },
                    { id: 'heworks', en: 'He works', pt: 'Ele trabalha', tip: 'Com he/she/it: verbo + S.' }
                ],
                pattern: {
                    title: { pt: 'Presente simples: hábitos e fatos', en: 'Present simple: habits and facts' },
                    discover: {
                        q: { pt: 'Complete: "My brother ___ on Saturdays."', en: 'Complete: "My brother ___ on Saturdays."' },
                        options: ['work', 'works', 'working'],
                        answer: 1,
                        why: { pt: 'Com he/she/it (e "my brother" = he) o verbo ganha S: works. Com I, you, we, they fica igual: I work, you work.', en: 'With he/she/it the verb takes an S.' }
                    },
                    rule: [
                        { pt: 'I / you / we / they → verbo igual: I work, they live.', en: 'Same verb for I/you/we/they.' },
                        { pt: 'He / she / it → verbo + S: he works, she lives, it rains.', en: 'He/she/it → verb + S.' },
                        { pt: 'Perguntar: Do you work? · Negar: I don\'t work. Depois de do/don\'t o verbo fica sem S.', en: 'Questions: Do you work? Negatives: I don\'t work.' }
                    ],
                    table: [['I work', 'eu trabalho'], ['He works', 'ele trabalha'], ['Do you work?', 'Você trabalha?'], ["I don't work.", 'Eu não trabalho.']],
                    contrast: 'O português muda o verbo para cada pessoa (trabalho, trabalhas, trabalha...). O inglês muda só no ele/ela, com um S. Menos formas para decorar!'
                },
                build: [
                    { pt: 'Eu moro em São Paulo.', en: ['I live in São Paulo.', 'I live in Sao Paulo.'] },
                    { pt: 'Você trabalha aos sábados?', en: ['Do you work on Saturdays?'] },
                    { pt: 'Eu não trabalho aos domingos.', en: ["I don't work on Sundays.", 'I do not work on Sundays.'] }
                ],
                cloze: [
                    { en: 'She ___ in a school.', answer: ['works'], options: ['works', 'work', 'working'], pt: 'Ela trabalha em uma escola.', why: 'She → verbo + S.' },
                    { en: 'I ___ work on Sundays.', answer: ["don't", 'do not'], options: ["don't", "doesn't", 'not'], pt: 'Eu não trabalho aos domingos.', why: 'Com I: don\'t.' },
                    { en: '___ you live in São Paulo?', answer: ['do'], options: ['Do', 'Are', 'Does'], pt: 'Você mora em São Paulo?', why: 'Pergunta no presente simples: Do you…?' }
                ],
                speak: [
                    { en: 'I work in a school. I teach English.', pt: 'Eu trabalho em uma escola. Eu ensino inglês.' },
                    { en: 'Where do you live?', pt: 'Onde você mora?' },
                    { en: "No, I don't. My brother works on Saturdays.", pt: 'Não. Meu irmão trabalha aos sábados.', tip: '"works" termina em /ks/: "workss".' }
                ],
                write: {
                    prompt: { pt: 'Escreva duas frases em inglês: o que você faz (trabalho ou estudo) e onde você mora.', en: 'Write two sentences: what you do (work or study) and where you live.' },
                    model: 'I work in an office. I live in São Paulo.',
                    checks: [
                        { re: '\\bi (work|study|teach|live|like|sell|drive|cook|write|read)\\b', miss: 'Use um verbo no presente com I (I work, I live, I study...).', hit: 'Presente simples ok.' },
                        { re: '\\b(in|at|near)\\b', miss: 'Diga o lugar (in…).', hit: 'Lugar ok.' }
                    ],
                    pass: 2
                }
            }
        ],
        boss: {
            id: 'w1boss', minutes: 10,
            title: { pt: 'Chefão: a festa', en: 'Boss: the party' },
            goal: { pt: 'Conversar com o Leo numa festa usando tudo que você aprendeu e se apresentar por escrito.', en: 'Chat with Leo at a party using everything you learned, then introduce yourself in writing.' },
            teach: {
                pt: 'Hora de usar tudo junto. Leo puxa conversa e você escolhe a resposta mais natural. Depois você se apresenta por escrito. Não é prova: é uma conversa. Errar aqui só mostra o que treinar.',
                en: 'Time to use everything together. Leo starts a chat and you pick the most natural reply.'
            },
            turns: [
                { npc: { en: "Hi! I'm Leo. What's your name?", pt: 'Oi! Eu sou o Leo. Qual é o seu nome?' }, replies: [
                    { en: 'My name is Sam.', ok: true, why: 'Natural e completo.' },
                    { en: 'I am name Sam.', ok: false, why: 'Falta "my": "My name is…". "I am Sam" também funciona.' },
                    { en: 'Me Sam name.', ok: false, why: 'A ordem das palavras não existe em inglês.' }] },
                { npc: { en: 'Nice to meet you. Where are you from?', pt: 'Prazer. De onde você é?' }, replies: [
                    { en: "I'm from Brazil.", ok: true, why: 'Verbo to be + from.' },
                    { en: 'I from Brazil.', ok: false, why: 'Falta o verbo: I AM from.' },
                    { en: 'I have from Brazil.', ok: false, why: 'Origem usa to be, não "have".' }] },
                { npc: { en: 'How old are you?', pt: 'Quantos anos você tem?' }, replies: [
                    { en: 'I am thirty years old.', ok: true, why: 'Idade = to be.' },
                    { en: 'I have thirty years.', ok: false, why: 'Em inglês a idade usa to be, não "have".' },
                    { en: "I'm thirty year.", ok: false, why: 'Com número maior que um: "years".' }] },
                { npc: { en: 'What do you do?', pt: 'O que você faz (da vida)?' }, replies: [
                    { en: 'I work in an office.', ok: true, why: 'Presente simples com I.' },
                    { en: 'I works in an office.', ok: false, why: 'Com I o verbo não leva S.' },
                    { en: 'I am work in an office.', ok: false, why: 'Não misture to be com outro verbo.' }] },
                { npc: { en: 'Can I get you a coffee?', pt: 'Posso trazer um café para você?' }, replies: [
                    { en: "Yes, please. I'd like a coffee.", ok: true, why: 'Educado e natural.' },
                    { en: 'Yes, I like for coffee.', ok: false, why: '"I\'d like a coffee" é o pedido educado.' },
                    { en: 'Coffee give me.', ok: false, why: 'A ordem das palavras não existe em inglês.' }] },
                { npc: { en: 'Nice talking to you. See you later!', pt: 'Foi bom falar com você. Até mais tarde!' }, replies: [
                    { en: 'Bye! See you later.', ok: true, why: 'Despedida natural.' },
                    { en: 'Goodbye I see you later.', ok: false, why: 'Duas ideias coladas: "Bye! See you later."' },
                    { en: 'See you later bye you.', ok: false, why: 'Palavras fora de ordem.' }] }
            ],
            write: {
                prompt: { pt: 'Escreva uma apresentação sua com 4 frases em inglês: seu nome, de onde você é, sua idade e o que você faz.', en: 'Write a 4-sentence introduction: your name, where you are from, your age and what you do.' },
                model: "My name is Sam. I'm from Brazil. I am thirty years old. I work in an office.",
                checks: [
                    { re: "\\b(my name is|i am [a-z]+\\.|i'm [a-z]+\\.)", miss: 'Falta o seu nome (My name is…).', hit: 'Nome ok.' },
                    { re: '\\bfrom\\b', miss: 'Falta de onde você é (…from…).', hit: 'Origem ok.' },
                    { re: "\\b(i am|i'm) (\\d+|[a-z-]+) (years old|year old)|\\b(i am|i'm) (\\d+|twenty|thirty|forty|fifty|sixty|seventy)", miss: 'Falta a idade (I am … years old).', hit: 'Idade ok.' },
                    { re: '\\bi (work|study|teach|live|like|sell|drive|cook|write|read)\\b', miss: 'Falta o que você faz (I work…, I study…).', hit: 'Rotina ok.' }
                ],
                pass: 3
            }
        }
    }]
};
