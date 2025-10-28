(function () {
    const isProductPage = location.pathname.includes('/product/');
    const previewMatch = location.hash.match(/product_preview=(\d+)/);
    const previewId = previewMatch ? previewMatch[1] : null;

    if (previewId) {
        const observer = new MutationObserver((_, obs) => {
            const modal = document.querySelector('[data-modal-product-id]');
            if (modal && modal.dataset.modalProductId === previewId) {
                obs.disconnect();

                const waitForContent = () => {
                    const nameEl = modal.querySelector('h1');
                    const priceEl = modal.querySelector('.price_main__nYHyt');

                    if (!nameEl || !priceEl) {
                        setTimeout(waitForContent, 200);
                        return;
                    }

                    handleProductModal(modal, previewId);
                };

                waitForContent();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (isProductPage) {
        const nameEl = document.querySelector('header.product_title__7yvWR h1');
        const priceEl = document.querySelector('.price_main__nYHyt');
        if (!nameEl || !priceEl) return;

        const name = nameEl.textContent.trim();
        const priceText = priceEl.textContent.replace(/\s/g, '').replace(',', '.');
        const price = parseFloat(priceText);
        if (isNaN(price)) return;

        const productId = location.pathname.split('/').pop();
        savePrice(productId, price);
        renderButton(name, productId);
    }

    function waitForContent(modal, productId) {
        const poll = setInterval(() => {
            const nameEl = modal.querySelector('h1');
            const priceEl = modal.querySelector('.price_main__nYHyt');
            if (!nameEl || !priceEl) return;

            clearInterval(poll);
            const name = nameEl.textContent.trim();
            const priceText = priceEl.textContent.replace(/\s/g, '').replace(',', '.');
            const price = parseFloat(priceText);
            if (isNaN(price)) return;

            savePrice(productId, price);
            renderButton(name, productId);
        }, 300);
    }

    function savePrice(productId, price) {
        const timestamp = new Date().toISOString();
        const key = `edostavka_price_history_${productId}`;

        chrome.storage.local.get([key], (result) => {
            const history = result[key] || [];
            const last = history[history.length - 1];
            const lastDate = last ? new Date(last.timestamp).toDateString() : null;
            const today = new Date().toDateString();
            const shouldSave = !last || last.price !== price || lastDate !== today;

            if (shouldSave) {
                history.push({ timestamp, price });
                chrome.storage.local.set({ [key]: history }, () => {
                    console.log(`✅ Сохранено: ${key}`, history);
                });
            } else {
                console.log(`⏸️ Цена не изменилась`);
            }
        });
    }

    function renderButton(name, productId) {
        const key = `edostavka_price_history_${productId}`;
        const btn = document.createElement('button');
        btn.innerHTML = `
      <span style="display: flex; align-items: center; gap: 8px;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor" width="24" height="24">
            <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      </span>
    `;
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            zIndex: '9999',
            padding: '10px 15px',
            background: '#02b875',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            fontSize: '16px'
        });

        btn.onclick = () => {
            const existing = document.getElementById('priceChartContainer');
            if (existing) {
                existing.remove();
                return;
            }

            const container = document.createElement('div');
            container.id = 'priceChartContainer';
            Object.assign(container.style, {
                position: 'fixed',
                bottom: '80px',
                left: '20px',
                width: '400px',
                height: '220px',
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '10px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                zIndex: '9999'
            });

            const canvas = document.createElement('canvas');
            canvas.id = 'priceChart';
            canvas.width = 380;
            canvas.height = 200;

            container.appendChild(canvas);
            document.body.appendChild(container);

            const chartScript = document.createElement('script');
            chartScript.src = chrome.runtime.getURL('chart.min.js');
            chartScript.onload = () => {
                chrome.storage.local.get([key], (result) => {
                    const data = (result[key] || []).filter(d => typeof d.price === 'number' && d.price > 0);
                    const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
                    const prices = data.map(d => d.price);

                    const initScript = document.createElement('script');
                    initScript.textContent = `
            new Chart(document.getElementById('priceChart'), {
              type: 'line',
              data: {
                labels: ${JSON.stringify(labels)},
                datasets: [{
                    data: ${JSON.stringify(prices)},
                    borderColor: '#0076d734',
                    backgroundColor: 'rgba(0,120,215,0.1)',
                    fill: true,
                    tension: 0.4
                }]
              },
            options: {
                responsive: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                    grid: { display: false }
                    },
                    y: {
                    beginAtZero: false,
                    grid: { display: false }
                    }
                }
            }
            });
`;
                    document.body.appendChild(initScript);
                });
            };
            document.body.appendChild(chartScript);

            const outsideClickHandler = (event) => {
                const chartContainer = document.getElementById('priceChartContainer');
                const isClickInsideChart = chartContainer?.contains(event.target);
                const isClickOnButton = btn.contains(event.target);
                if (!isClickInsideChart && !isClickOnButton) {
                    chartContainer?.remove();
                    document.removeEventListener('click', outsideClickHandler);
                }
            };
            document.addEventListener('click', outsideClickHandler);
        };

        document.body.appendChild(btn);
    }
})();
