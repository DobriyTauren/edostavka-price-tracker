(function () {
    var isProductPage = location.pathname.includes('/product/');
    var previewMatch = location.hash.match(/product_preview=(\d+)/);
    var previewId = previewMatch ? previewMatch[1] : null;
    let isChartVisible = false;
    let lastUrl = location.href;

    new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;

            onUrlChange();
        }
    }).observe(document.body, { childList: true, subtree: true });

    injectChartBootstrap();

    function injectChartBootstrap() {
        if (window.__edostavkaChartInjected) return;
        window.__edostavkaChartInjected = true;

        // 1️⃣ Впрыскиваем Chart.js
        const chartScript = document.createElement('script');
        chartScript.src = chrome.runtime.getURL('chart.min.js');
        chartScript.onload = () => {
            // 2️⃣ Впрыскиваем bootstrap, чтобы он работал в контексте страницы
            const bootstrap = document.createElement('script');
            bootstrap.textContent = `
                (function() {
                    if (window.__edostavkaBootstrapReady) return;
                    window.__edostavkaBootstrapReady = true;

                    window.addEventListener('message', (event) => {
                        if (!event.data || event.data.type !== 'EDOST_CREATE_CHART') return;
                        const { canvasId, labels, prices } = event.data;
                        const canvas = document.getElementById(canvasId);
                        if (!canvas) return;
                        try {
                            const ctx = canvas.getContext('2d');
                            if (!ctx) throw new Error('No context');
                            if (canvas.__chartInstance) canvas.__chartInstance.destroy();
                            const chart = new Chart(ctx, {
                                type: 'line',
                                data: {
                                    labels,
                                    datasets: [{
                                        data: prices,
                                        borderColor: '#0076d734',
                                        backgroundColor: 'rgba(0,120,215,0.1)',
                                        fill: true,
                                        tension: 0.4
                                    }]
                                },
                                options: {
                                    responsive: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        x: { grid: { display: false } },
                                        y: { beginAtZero: false, grid: { display: false } }
                                    }
                                }
                            });
                            canvas.__chartInstance = chart;
                        } catch (e) {
                            console.error('[edostavka] Chart creation failed:', e);
                        }
                    });

                    console.log('[edostavka] Chart.js bootstrap active');
                })();
            `;
            (document.head || document.documentElement).appendChild(bootstrap);
        };
        (document.head || document.documentElement).appendChild(chartScript);
    }

    if (previewId) ModalGetData(previewId);
    else if (isProductPage) PageGetData();

    function onUrlChange() {
        isProductPage = location.pathname.includes('/product/');
        previewMatch = location.hash.match(/product_preview=(\d+)/);
        previewId = previewMatch ? previewMatch[1] : null;

        // 🧠 При смене URL — очищаем старый график и кнопку
        document.getElementById('price-history-button')?.remove();
        document.getElementById('priceChartContainer')?.remove();

        if (previewId) {
            ModalGetData(previewId);
        }
        else if (isProductPage) {
            PageGetData();
        }
    }


    function PageGetData() {
        const nameEl = document.querySelector('.heading_heading__text_level_1__7_duQ');
        const priceEl = document.querySelector('.price_main__nYHyt');
        if (!nameEl || !priceEl) return;

        const name = nameEl.textContent.trim();
        const price = parseFloat(priceEl.textContent.replace(/\\s/g, '').replace(',', '.'));
        if (isNaN(price)) return;

        const productId = location.pathname.split('/').pop();
        savePrice(productId, price, () => {
            renderButton(name, productId, document);
            if (isChartVisible) showChartForProduct(productId, document);
        });
    }

    function ModalGetData(productId) {
        const observer = new MutationObserver((_, obs) => {
            const modal = document.getElementById(`product-modal-${previewId}`);
            if (modal) {

                console.log("modal");

                obs.disconnect();
                const nameEl = modal.querySelector('.heading_heading__text_level_1__7_duQ');
                const priceEl = modal.querySelector('.price_main__nYHyt');
                if (!nameEl || !priceEl) return;
                const name = nameEl.textContent.trim();
                const price = parseFloat(priceEl.textContent.replace(/\s/g, '').replace(',', '.'));
                if (isNaN(price)) return;
                savePrice(productId, price, () => {
                    renderButton(name, productId, modal);
                    console.log("button ready");
                    // if (isChartVisible) showChartForProduct(productId);
                });

            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    
    function showChartForProduct(productId, parent) {
        const key = `edostavka_price_history_${productId}`;
        let containerHeight = previewId ? 150 : 220;
        const containerWidth = 400;
        const btn = document.getElementById('price-history-button');
        if (!btn) return;

        // Удаляем старый график
        const existing = document.getElementById('priceChartContainer');
        if (existing) existing.remove();

        const isModal = parent !== document;

        // Создаём контейнер графика
        const container = document.createElement('div');
        container.id = 'priceChartContainer';
        Object.assign(container.style, {
            position: isModal ? 'absolute' : 'absolute',
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: '9999'
        });

        // Позиционирование
        if (isModal) {
            parent.appendChild(container);
            const rect = btn.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            const top = rect.top - parentRect.top;
            const left = rect.left - parentRect.left;

            Object.assign(container.style, {
                top: `${top - containerHeight - 6}px`,
                left: `${left + btn.offsetWidth - containerWidth}px`
            });
        } else {
            const rect = btn.getBoundingClientRect();
            container.style.top = `${rect.top + window.scrollY - containerHeight - 8}px`;
            container.style.left = `${rect.right + window.scrollX - containerWidth}px`;
            document.body.appendChild(container);
        }

        // Канвас
        const canvas = document.createElement('canvas');
        canvas.id = 'priceChart';
        canvas.width = 380;
        canvas.height = containerHeight - 20;
        container.appendChild(canvas);

        // Данные
        chrome.storage.local.get([key], (result) => {
            const data = (result[key] || []).filter(d => d.price > 0);
            const labels = data.map(d => new Date(d.timestamp).toLocaleDateString());
            const prices = data.map(d => d.price);

            window.postMessage({
                type: 'EDOST_CREATE_CHART',
                canvasId: 'priceChart',
                labels,
                prices
            }, '*');
        });
    }


    function savePrice(productId, price, callback) {
        const timestamp = new Date().toISOString();
        const key = `edostavka_price_history_${productId}`;
        chrome.storage.local.get([key], (result) => {
            const history = result[key] || [];
            const last = history.at(-1);
            const today = new Date().toDateString();
            if (!last || last.price !== price || new Date(last.timestamp).toDateString() !== today) {
                history.push({ timestamp, price });
                chrome.storage.local.set({ [key]: history }, () => {
                    if (callback) callback();
                });
            } else {
                if (callback) callback();
            }
        });
    }


    function renderButton(name, productId, parrent) {
        // удаляем старую кнопку, если она была
        const oldBtn = document.getElementById('price-history-button');
        if (oldBtn) oldBtn.remove();

        const btn = document.createElement('button');
        btn.id = 'price-history-button';
        btn.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24">
                <path stroke-linecap="round" stroke-linejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
        </span>`;

        Object.assign(btn.style, {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            padding: '0',
            fontSize: '16px',
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #ffaf4e 0%, #ff6459 100%)', // диагональный градиент
            color: '#fff',
            border: 'none',
            borderRadius: '20%',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        });


        btn.onclick = () => {
            const container = document.getElementById('priceChartContainer');
            if (container) {
                container.remove();
                isChartVisible = false;
            } else {
                showChartForProduct(productId, parrent);
                isChartVisible = true;
            }
        };

        // Находим элемент с "шт"
        const priceBlock = parrent.querySelector('.price_price__NZl0e');
        if (priceBlock) {
            priceBlock.style.position = 'relative'; // чтобы absolute работал внутри
            btn.style.position = 'absolute';
            btn.style.top = '50%';
            btn.style.right = '8px'; // отступ справа
            btn.style.transform = 'translateY(-50%)'; // центрируем по вертикали
            priceBlock.appendChild(btn);
        }

    }



})();
