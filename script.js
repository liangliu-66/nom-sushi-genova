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
        const particleCount = 22; // Numero ottimale di foglie in caduta

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // Palette toni verdi tropicali (incluso il verde brand #009245)
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
                this.size = Math.random() * 12 + 10; // Dimensione (10px - 22px)
                this.speedY = Math.random() * 0.9 + 0.5; // Velocità discesa
                this.speedX = Math.random() * 0.6 - 0.3; // Spinta orizzontale
                this.opacity = Math.random() * 0.35 + 0.25; // Trasparenza delicata
                this.angle = Math.random() * Math.PI * 2;
                this.spin = Math.random() * 0.02 - 0.01;
                this.swingSpeed = Math.random() * 0.02 + 0.01;
                this.color = tropicalColors[Math.floor(Math.random() * tropicalColors.length)];
                this.type = Math.floor(Math.random() * 2); // 0 = Bamboo/Palma, 1 = Monstera/Ovale
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
                    // FOGLIA LANCEOLATA (TIPO BAMBOO / PALMA)
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 1.8);
                    ctx.quadraticCurveTo(this.size * 0.7, -this.size * 0.4, 0, this.size * 1.8);
                    ctx.quadraticCurveTo(-this.size * 0.7, -this.size * 0.4, 0, -this.size * 1.8);
                    ctx.fill();

                    // Nervatura centrale
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 1.5);
                    ctx.lineTo(0, this.size * 1.5);
                    ctx.stroke();
                } else {
                    // FOGLIA OVALE TROPICALE CON NERVATURE (TIPO MONSTERA)
                    ctx.beginPath();
                    ctx.moveTo(0, -this.size * 1.4);
                    ctx.bezierCurveTo(this.size * 1.2, -this.size * 0.6, this.size * 1.1, this.size * 0.8, 0, this.size * 1.4);
                    ctx.bezierCurveTo(-this.size * 1.1, this.size * 0.8, -this.size * 1.2, -this.size * 0.6, 0, -this.size * 1.4);
                    ctx.fill();

                    // Nervature secondarie
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
