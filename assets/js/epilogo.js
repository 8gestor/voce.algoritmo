/* epilogo.js — botão final "DESLIGAR A MATRIX" do Epílogo (cap14). */
function triggerExit() {
    const btn = document.querySelector('.btn-exit');
    const msg = document.getElementById('final-message');
    btn.style.display = 'none';
    msg.style.opacity = '1';

    setTimeout(() => {
        document.body.style.transition = 'filter 3s ease';
        document.body.style.filter = 'brightness(0)';
    }, 2500);
}