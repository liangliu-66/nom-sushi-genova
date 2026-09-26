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

    // ==========================================
    // 4. ANIMAZIONE FOGLIE TROPICALI VETTORIALI (NO PNG)
    // ==========================================
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];
        const particleCount = 22;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const tropicalColors = [
            '#009245',
            '#1b5e20',
            '#4caf50',
            '#81c784',
            '#2e7d32'
        ];

        class VectorLeaf {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * -canvas.height;
                this.size = Math.random() * 12 + 10;
                this.speedY = Math.random() * 0.9 + 0.5;
                this.speedX = Math.random() * 0.6 - 0.3;
                this.opacity = Math.random() * 0.35 + 0.25;
                this.angle = Math.random() * Math.PI * 2;
                this.spin = Math.random() * 0.02 - 0.01;
                this.swingSpeed = Math.random() * 0.02 + 0.01;
                this.color = tropicalColors[Math.floor(Math.random() * tropicalColors.length)];
                this.type = Math.floor(Math.random() * 2);
            }

            update() {
                this.y += this.speedY;
                this.x += Math.sin(this.y * this.swingSpeed) * 0.8 + this.speedX;
                this.angle += this.spin;

                if (this.y > canvas.height + 30) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = this.color;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1;

                if (this.type === 0) {
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 1.8);
                    ctx.quadraticCurveTo(this.size * 0.7, -this.size * 0.4, 0, this.size * 1.8);
                    ctx.quadraticCurveTo(-this.size * 0.7, -this.size * 0.4, 0, -this.size * 1.8);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 1.5);
                    ctx.lineTo(0, this.size * 1.5);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 1.4);
                    ctx.bezierCurveTo(this.size * 1.2, -this.size * 0.6, this.size * 1.1, this.size * 0.8, 0, this.size * 1.4);
                    ctx.bezierCurveTo(-this.size * 1.1, this.size * 0.8, -this.size * 1.2, -this.size * 0.6, 0, -this.size * 1.4);
                    ctx.fill();

                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 1.2);
                    ctx.lineTo(0, this.size * 1.2);
                    ctx.moveTo(0, -this.size * 0.4); ctx.lineTo(this.size * 0.5, -this.size * 0.7);
                    ctx.moveTo(0, -this.size * 0.4); ctx.lineTo(-this.size * 0.5, -this.size * 0.7);
                    ctx.moveTo(0, this.size * 0.2); ctx.lineTo(this.size * 0.5, -0.1 * this.size);
                    ctx.moveTo(0, this.size * 0.2); ctx.lineTo(-this.size * 0.5, -0.1 * this.size);
                    ctx.stroke();
                }

                ctx.restore();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new VectorLeaf());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(leaf => {
                leaf.update();
                leaf.draw();
            });
            requestAnimationFrame(animate);
        }

        animate();
    }
});


// ==========================================
// 5. FUNZIONI CHAT AI (GLOBALI)
// ==========================================

// Gestione apertura/chiusura finestra chat
function toggleChat() {
    const chatBox = document.getElementById('nom-chat-box');
    if (chatBox) {
        chatBox.classList.toggle('hidden');
    }
}

// Invia con il tasto Invio
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendUserMessage();
    }
}

// Funzione principale di invio messaggio
async function sendUserMessage() {
    const inputField = document.getElementById('nom-user-input');
    const messageContainer = document.getElementById('nom-chat-messages');
    if (!inputField || !messageContainer) return;

    const text = inputField.value.trim();
    if (!text) return;

    // Mostra il messaggio dell'utente (sanificato)
    messageContainer.innerHTML += `<div class="user-msg">${escapeHtml(text)}</div>`;
    inputField.value = '';
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Messaggio di caricamento temporaneo
    const loadingId = 'loading-' + Date.now();
    messageContainer.innerHTML += `<div id="${loadingId}" class="bot-msg"><em>Sto scrivendo...</em></div>`;
    messageContainer.scrollTop = messageContainer.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        
        // Rimuovi il caricamento
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();

        if (response.ok) {
            messageContainer.innerHTML += `<div class="bot-msg">${formatBotMessage(data.reply)}</div>`;
        } else {
            messageContainer.innerHTML += `<div class="bot-msg">Mi dispiace, si è verificato un errore temporaneo.</div>`;
        }
    } catch (error) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) loadingElement.remove();
        messageContainer.innerHTML += `<div class="bot-msg">Errore di connessione al server.</div>`;
    }

    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function formatBotMessage(text) {
    let formattedText = escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\[BTN:PRENOTA\]/g, '<br><a href="https://www.nomsushi.shop/?action=reserve" target="_blank" class="chat-cta-btn">📅 Prenota Tavolo</a>')
        .replace(/\[BTN:ORDELIVERY\]/g, '<br><a href="https://go.ordelivery.shop/#/restaurantPage?string_id=SZPTV" target="_blank" class="chat-cta-btn">🛵 Ordina con Ordelivery</a>')
        .replace(/\[BTN:JUSTEAT\]/g, '<br><a href="https://www.justeat.it/restaurants-nom-sushi-vibes-genova/menu?serviceType=collection&utm_source=google&utm_medium=organic&utm_campaign=foodorder" target="_blank" class="chat-cta-btn">🍱 Ordina con Just Eat</a>')
        .replace(/\[BTN:DELIVEROO\]/g, '<br><a href="https://deliveroo.it/it/menu/genova/genova-centro/nom-sushi-vibes/?fulfillment_type=COLLECTION/" target="_blank" class="chat-cta-btn">🍣 Ordina con Deliveroo</a>')
        .replace(/\[BTN:MENU_PRANZO\]/g, '<br><a href="pdf/menu-sushi-pranzo-genova-nom.pdf" target="_blank" class="chat-cta-btn">🍱 Apri Menu Pranzo</a>')
        .replace(/\[BTN:MENU_CENA\]/g, '<br><a href="pdf/menu-sushi-cena-genova-nom.pdf" target="_blank" class="chat-cta-btn">🍣 Apri Menu Cena</a>')
        .replace(/\[BTN:MAPPA\]/g, '<br><a href="https://www.google.com/maps/search/?api=1&query=NOM+SUSHI+VIBES+Via+XII+Ottobre+192r+16121+Genova+GE" target="_blank" class="chat-cta-btn">📍 Apri su Google Maps</a>')
        .replace(/\[BTN:INSTAGRAM\]/g, '<br><a href="https://www.instagram.com/nom_sushi_genova/" target="_blank" class="chat-cta-btn">📸 Instagram</a>')
        .replace(/\[BTN:FACEBOOK\]/g, '<br><a href="https://www.facebook.com/nomsushi" target="_blank" class="chat-cta-btn">📘 Facebook</a>')
        .replace(/\[BTN:TRIPADVISOR\]/g, '<br><a href="https://www.tripadvisor.it/Restaurant_Review-g187823-d24165947-Reviews-Nom_Sushi_Vibes-Genoa_Italian_Riviera_Liguria.html" target="_blank" class="chat-cta-btn">🦉 TripAdvisor</a>');

    return formattedText;
}

// Sicurezza anti-XSS di base
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}