/* glossario.js — filtro de busca do Glossário (cap15). */
function filterGlossary() {
    const input = document.getElementById('term-search').value.toUpperCase();
    const cards = document.getElementsByClassName('term-card');
    for (let i = 0; i < cards.length; i++) {
        const title = cards[i].querySelector('.term-title').innerText;
        const def = cards[i].querySelector('.term-def').innerText;
        const match = title.toUpperCase().includes(input) || def.toUpperCase().includes(input);
        cards[i].style.display = match ? '' : 'none';
    }
}