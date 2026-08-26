document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Gestione Menu a Tendina
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navDropdown = document.getElementById('nav-dropdown');

    if (hamburgerBtn && navDropdown) {
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!navDropdown.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                navDropdown.classList.remove('active');
            }
        });
    }

    // 2. Funzione per l'apertura e chiusura dei Popup Modali
    function setupModal(openBtnId, closeBtnId, modalId) {
        const openBtn = document.getElementById(openBtnId);
        const closeBtn = document.getElementById(closeBtnId);
        const modal = document.getElementById(modalId);

        if (openBtn && closeBtn && modal) {
            openBtn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
            });

            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    }

    // 3. Attivazione di tutti i Pop-up della pagina
    setupModal('open-delivery-modal', 'close-delivery-modal', 'delivery-modal');
    setupModal('open-prices-modal', 'close-prices-modal', 'prices-modal');
    setupModal('open-aperi-modal', 'close-aperi-modal', 'aperi-modal');
    setupModal('open-map-modal', 'close-map-modal', 'map-modal');

});
