document.addEventListener('DOMContentLoaded', () => {
    const itemsContainer = document.getElementById('items');
    const clearAllBtn = document.getElementById('clearAll');
    const searchInput = document.getElementById('searchInput');

    loadItems();

    searchInput.addEventListener('input', () => {
        loadItems(searchInput.value.trim());
    });

    function loadItems(filter = "") {
        chrome.storage.local.get(null, (all) => {
            const keys = Object.keys(all).filter(k => k.startsWith("edostavka_price_history_"));

            const filteredKeys = keys.filter(k => {
                const productId = k.replace("edostavka_price_history_", "");
                return productId.includes(filter);
            });

            if (filteredKeys.length === 0) {
                itemsContainer.innerHTML = "";
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty';
                emptyDiv.textContent = "Нет сохранённых данных";
                itemsContainer.appendChild(emptyDiv);
                return;
            }

            itemsContainer.innerHTML = "";

            filteredKeys.sort((a, b) => {
                const idA = a.replace("edostavka_price_history_", "");
                const idB = b.replace("edostavka_price_history_", "");
                return idA.localeCompare(idB, undefined, { numeric: true });
            });

            filteredKeys.forEach(key => {
                const productId = key.replace("edostavka_price_history_", "");
                const history = all[key] || [];

                history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                const block = document.createElement("div");
                block.className = "item";

                const idDiv = document.createElement("div");
                idDiv.innerHTML = `<strong>ID товара:</strong> ${productId}`;
                block.appendChild(idDiv);

                const historyDiv = document.createElement("div");
                historyDiv.style.marginTop = "6px";
                history.forEach(h => {
                    const entry = document.createElement("div");
                    const date = new Date(h.timestamp).toLocaleDateString();
                    entry.innerHTML = `${date}: <strong>${h.price}</strong>`;
                    historyDiv.appendChild(entry);
                });
                block.appendChild(historyDiv);

                const delBtn = document.createElement("button");
                delBtn.className = "delete-btn";
                delBtn.dataset.id = productId;
                delBtn.textContent = "Удалить историю";
                block.appendChild(delBtn);

                block.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-btn')) return;
                    const url = `https://edostavka.by/product/${productId}`;
                    window.open(url, '_blank');
                });

                itemsContainer.appendChild(block);

                delBtn.addEventListener('click', () => removeItem(productId));
            });
        });
    }

    function removeItem(productId) {
        chrome.storage.local.remove("edostavka_price_history_" + productId, () => {
            loadItems(searchInput.value.trim());
        });
    }

    clearAllBtn.addEventListener('click', () => {
        if (!confirm("Вы уверены, что хотите удалить все сохранённые записи?")) return;

        chrome.storage.local.get(null, (all) => {
            const keys = Object.keys(all).filter(k => k.startsWith("edostavka_price_history_"));
            chrome.storage.local.remove(keys, () => loadItems(searchInput.value.trim()));
        });
    });
});
