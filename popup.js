    document.addEventListener('DOMContentLoaded', () => {
        const itemsContainer = document.getElementById('items');
        const clearAllBtn = document.getElementById('clearAll');
        const searchInput = document.getElementById('searchInput');

        loadItems();

        // Поиск по ID товара
        searchInput.addEventListener('input', () => {
            loadItems(searchInput.value.trim());
        });

        function loadItems(filter = "") {
            chrome.storage.local.get(null, (all) => {
                const keys = Object.keys(all).filter(k => k.startsWith("edostavka_price_history_"));

                // фильтр по ID товара
                const filteredKeys = keys.filter(k => {
                    const productId = k.replace("edostavka_price_history_", "");
                    return productId.includes(filter);
                });

                if (filteredKeys.length === 0) {
                    itemsContainer.innerHTML = "<div class='empty'>Нет сохранённых данных</div>";
                    return;
                }

                itemsContainer.innerHTML = "";

                // Сортируем по ID
                filteredKeys.sort((a, b) => {
                    const idA = a.replace("edostavka_price_history_", "");
                    const idB = b.replace("edostavka_price_history_", "");
                    return idA.localeCompare(idB, undefined, { numeric: true });
                });

                filteredKeys.forEach(key => {
                    const productId = key.replace("edostavka_price_history_", "");
                    const history = all[key] || [];

                    // сортировка истории по дате
                    history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                    const block = document.createElement("div");
                    block.className = "item";

                    let historyHTML = history.map(h => {
                        const date = new Date(h.timestamp).toLocaleDateString();
                        return `<div>${date}: <strong>${h.price}</strong></div>`;
                    }).join("");

                    block.innerHTML = `
                        <div><strong>ID товара:</strong> ${productId}</div>
                        <div style="margin-top:6px;">${historyHTML}</div>
                        <button class="delete-btn" data-id="${productId}">Удалить историю</button>
                    `;

                    // клик по карточке — открываем товар на edostavka.by
                    block.addEventListener('click', (e) => {
                        if (e.target.classList.contains('delete-btn')) return;
                        const url = `https://edostavka.by/product/${productId}`;
                        window.open(url, '_blank');
                    });

                    itemsContainer.appendChild(block);
                });

                document.querySelectorAll(".delete-btn").forEach(btn => {
                    btn.onclick = () => removeItem(btn.dataset.id);
                });
            });
        }

        function removeItem(productId) {
            chrome.storage.local.remove("edostavka_price_history_" + productId, () => {
                loadItems(searchInput.value.trim());
            });
        }

        // Подтверждение удаления всех записей
        clearAllBtn.onclick = () => {
            const confirmDelete = confirm("Вы уверены, что хотите удалить все сохранённые записи?");
            if (!confirmDelete) return;

            chrome.storage.local.get(null, (all) => {
                const keys = Object.keys(all).filter(k => k.startsWith("edostavka_price_history_"));
                chrome.storage.local.remove(keys, () => {
                    loadItems(searchInput.value.trim());
                });
            });
        };
    });