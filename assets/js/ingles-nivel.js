/*
 * ingles-nivel.js — estimativa de dificuldade do texto em inglês.
 *
 * Usa uma lista local das palavras mais comuns do inglês (sem rede). Mede (a) quantas palavras do texto ficam
 * fora dessa lista e (b) o comprimento médio das frases. É uma ESTIMATIVA para escolher a próxima leitura, não
 * uma classificação oficial (CEFR). Nomes próprios no meio da frase não contam.
 */
(function () {
    'use strict';
    const D = window.DDLab;
    if (!D) return;
    const VERSION = 1;

    // ~1.000 palavras mais frequentes (formas-base; plurais, -ed, -ing, -ly e 's são reduzidos antes da consulta)
    const COMMON = new Set(('a able about above across act add afraid after again against age ago agree air all allow almost alone along already also always among an ' +
        'and anger animal another answer any anyone anything appear are area arm around arrive art as ask at attack away baby back bad bag ball bank bar base be bear beat ' +
        'beautiful because become bed before begin behind believe bell below best better between big bill bird bit black blood blow blue board boat body book born both bottom box ' +
        'boy break bring brother brown build burn business but buy by call can capital car card care carry case cat catch cause cent center century certain chair chance change ' +
        'character charge check child choose church circle city claim class clean clear climb close clothes cloud coast cold color come common company compare complete ' +
        'condition consider contain continue control cook cool copy corn corner cost could count country course cover create cross crowd cry cut dance danger dark data date ' +
        'daughter day dead deal dear death decide deep degree depend describe desert design determine develop die difference different difficult dinner direct discover ' +
        'distance divide do doctor dog dollar done door double down draw dream dress drink drive drop dry during each ear early earth east easy eat edge effect egg eight ' +
        'either electric else end enemy energy engine enough enter equal even evening event ever every exact example except excite exercise expect experience explain eye face ' +
        'fact fair fall family famous far farm fast fat father fear feel feet fell few field fight figure fill final find fine finger finish fire first fish fit five fix ' +
        'flat floor flow flower fly follow food foot for force foreign forest forget form forward found four free fresh friend from front fruit full fun game garden gas gave ' +
        'general get girl give glad glass go god gold gone good got govern grass great green grew ground group grow guess gun guy had hair half hand happen happy hard has hat ' +
        'have he head hear heart heat heavy held help her here high hill him his history hit hold hole home hope horse hot hour house how however huge human hundred hunt hurry ' +
        'hurt i ice idea if imagine important in inch include indeed industry insect instead interest into iron is island it its job join joy jump just keep kept key kill ' +
        'kind king knew know lady lake land language large last late laugh law lay lead learn least leave led left leg length less let letter level lie life lift light like ' +
        'line lip list listen little live local lone long look lose lot loud love low machine made main major make man many map mark market master match matter may me mean ' +
        'measure meat meet member men metal method middle might mile milk million mind mine minute miss modern moment money month moon more morning most mother mountain mouth ' +
        'move much music must my name nation natural nature near necessary neck need never new news next nice night nine no noise none noon nor north nose not note nothing ' +
        'notice noun now number object observe ocean of off offer office often oil old on once one only open operate opposite or order other our out over own page pain pair ' +
        'paper paragraph parent part particular party pass past path pattern pay people perhaps period person pick picture piece place plain plan plane planet plant play ' +
        'please plural point poor popular position possible pound power practice prepare present president press pretty print probably problem process produce product ' +
        'proper protect prove provide pull push put quart question quick quiet quite race radio rail rain raise ran range rather reach read ready real reason receive record ' +
        'red region remember repeat reply report represent require rest result return rich ride right ring rise river road rock roll room root rope rose round row rub rule ' +
        'run safe said sail salt same sand sat saw say scale school science score sea search season seat second section see seed seem seen sell send sense sent sentence ' +
        'separate serve set settle seven several shall shape share sharp she sheep shine ship shoe shop shore short should shoulder shout show side sight sign silent silver ' +
        'similar simple since sing single sister sit six size skin sky sleep slip slow small smell smile snow so social soft soil sold soldier solution some someone ' +
        'something son song soon sound south space speak special speed spell spend spoke spread spring square stand star start state station stay steam steel step stick ' +
        'still stone stood stop store story straight strange stream street stretch string strong student study subject substance succeed such sudden sugar suggest suit ' +
        'summer sun supply support sure surface surprise swim syllable symbol system table tail take talk tall teach team tell temperature ten term test than thank that the ' +
        'their them then there these they thick thin thing think third this those though thought thousand three through throw thus tie time tiny tire to today together told ' +
        'tone too took tool top total touch toward town track trade train travel tree triangle trip trouble truck true try tube turn twenty two type under unit until up upon ' +
        'us use usual valley value various verb very view village visit voice vowel wait walk wall want war warm was wash watch water wave way we wear weather week weight ' +
        'well went were west what wheel when where whether which while white who whole whose why wide wife wild will win wind window wing winter wire wish with within woman ' +
        'women wonder wood word work world would write wrong yard year yellow yes yet you young your able accept accident account achieve action activity actual addition ' +
        'address adult advice affect agency agent agreement ahead aim allow amount analysis ancient announce apply approach argue arrange article aspect assume attention ' +
        'audience author available average avoid award aware balance band basic basis battle beyond bit blame blind border bother brain branch brave breath bridge brief ' +
        'bright broad budget camera campaign cancer candidate career carefully category cell chain challenge chief choice citizen civil clearly client close collect college ' +
        'comfort commit communicate community complex concern conference confirm connect consumer content context contract contrast conversation cost court crime crisis ' +
        'culture current customer damage debate decade decision defend define delay deliver demand democracy department detail develop device direction director discuss ' +
        'disease display district doubt drug economy edge education effort election emotion employee encourage environment error escape establish evidence exist expert ' +
        'express extra failure fall feature federal fee female finally financial firm flight focus foreign formal former foundation friendship function fund future gain ' +
        'gather global goal government growth guide handle hang headline health heavy hello hide hospital host household huge identify image impact improve income increase ' +
        'indicate individual influence information injury inside instance institution insurance intend internet interview introduce investigate involve issue item judge ' +
        'knowledge label leader league legal lesson limit link literature lower maintain manage manager manner material maybe media medical mention message military ' +
        'minister minor mission mix mood movement multiple murder nearly negative network normal nuclear obvious occur official online opinion option organization ' +
        'outside overall owner parent partner patient peace perform personal physical plastic policy political pool pressure previous price principle prison private ' +
        'professional program project property purpose quality quickly rate reach reality recent recognize reduce reflect relate release remain remove replace research ' +
        'resource respond response responsibility review role rule safety sale sample save scene schedule screen section security senior series session sex sign ' +
        'significant site situation skill software source speech sport staff standard stock strategy structure style success suffer supply surface survey tax technology ' +
        'television tend text theory threat title tonight tough tourist trade tradition training treat treatment trial truth unless union unique upper urban usually ' +
        'victim violence visit volume vote wage wall wear weapon website western whatever whenever whether wine wise within wonder worker worry yourself will would ' +
        'could should might shall doesn don didn isn wasn aren weren hasn haven hadn won wouldn couldn shouldn can cannot lets ok yeah oh hey okay mr mrs ms dr ' +
        'sir mom dad kid guy stuff thing really actually maybe probably already enough almost pretty quite rather maybe perhaps indeed however although though ' +
        'whereas whom whose whatever whichever ourselves themselves himself herself itself myself yourself oneself another other others each every both either ' +
        'neither many much few fewer less least more most several such same own very too so just only even still also again ever never always often sometimes ' +
        'usually soon later early late today tomorrow yesterday now then here there where when why how what which who whom').split(/\s+/).filter(Boolean));

    // reduz flexões simples à forma-base para consultar a lista
    function isCommon(w) {
        if (COMMON.has(w)) return true;
        const cands = [];
        if (w.endsWith("'s") || w.endsWith('’s')) cands.push(w.slice(0, -2));
        if (w.endsWith('s')) cands.push(w.slice(0, -1));
        if (w.endsWith('es')) cands.push(w.slice(0, -2));
        if (w.endsWith('ies')) cands.push(w.slice(0, -3) + 'y');
        if (w.endsWith('ed')) { cands.push(w.slice(0, -2), w.slice(0, -1)); if (/(.)\1ed$/.test(w)) cands.push(w.slice(0, -3)); if (w.endsWith('ied')) cands.push(w.slice(0, -3) + 'y'); }
        if (w.endsWith('ing')) { cands.push(w.slice(0, -3), w.slice(0, -3) + 'e'); if (/(.)\1ing$/.test(w)) cands.push(w.slice(0, -4)); }
        if (w.endsWith('ly')) cands.push(w.slice(0, -2));
        if (w.endsWith('er')) cands.push(w.slice(0, -2), w.slice(0, -1));
        if (w.endsWith('est')) cands.push(w.slice(0, -3));
        if (w.endsWith('n\'t') || w.endsWith('n’t')) cands.push(w.slice(0, -3));
        return cands.some((c) => c.length > 1 && COMMON.has(c));
    }

    const L = {
        pt: { lv: ['Fácil', 'Médio', 'Difícil', 'Muito difícil'], lead: 'Dificuldade', unc: 'palavras incomuns em 100', common: 'comum', rare: 'incomum', est: 'estimativa' },
        en: { lv: ['Easy', 'Medium', 'Hard', 'Very hard'], lead: 'Difficulty', unc: 'uncommon words per 100', common: 'common', rare: 'uncommon', est: 'estimate' }
    };
    const T = (k) => L[D.state.readLang][k];

    // Mede o documento (apenas inglês). Devolve { v, unc (por 100), avg (palavras/frase), lv (0..3) }.
    function measure(doc) {
        if (doc.lang !== 'en') return null;
        let total = 0, rare = 0, sents = 0, words = 0;
        for (const p of doc.paras) {
            if (p.t === 'h') continue;
            for (const s of p.s) {
                sents++;
                const toks = s.match(/[\p{L}][\p{L}'’]*/gu) || [];
                words += toks.length;
                toks.forEach((raw, i) => {
                    if (i > 0 && /^\p{Lu}/u.test(raw)) return;          // nome próprio no meio da frase
                    total++;
                    if (!isCommon(raw.toLowerCase())) rare++;
                });
            }
        }
        if (total < 50) return null;
        const unc = rare / total * 100, avg = words / Math.max(1, sents);
        const score = unc + Math.max(0, avg - 15) * 0.6;
        return { v: VERSION, unc: Math.round(unc * 10) / 10, avg: Math.round(avg * 10) / 10, lv: score < 16 ? 0 : score < 26 ? 1 : score < 34 ? 2 : 3 };
    }

    const label = (x) => T('lead') + ': ' + T('lv')[x.lv] + ' (≈ ' + String(x.unc).replace('.', D.state.readLang === 'en' ? '.' : ',') + ' ' + T('unc') + ')';

    function ensure(doc) {
        if (!doc || (doc.x && doc.x.lvl && doc.x.lvl.v === VERSION)) return;
        doc.x = doc.x || {};
        const r = measure(doc);
        if (r) { doc.x.lvl = r; if (D.saveMeta) D.saveMeta(); }
    }
    function show() {
        const doc = D.doc, host = D.$('lb-doc-meta');
        if (!doc || !host) return;
        host.querySelectorAll('.lb-lvl').forEach((n) => n.remove());
        if (doc.x && doc.x.lvl) { const s = document.createElement('span'); s.className = 'lb-lvl'; s.textContent = ' · ' + label(doc.x.lvl); host.appendChild(s); }
    }

    D.on('open', () => { setTimeout(() => { ensure(D.doc); show(); }, 30); });
    D.on('lang', show);
    D.badge = (m) => (m.x && m.x.lvl ? label(m.x.lvl) : '');
    D.wordInfo = (w, lang) => (lang === 'en' ? (isCommon(w) ? T('common') : T('rare')) : '');
    window.__ddNivel = { measure, isCommon, size: COMMON.size };
})();
