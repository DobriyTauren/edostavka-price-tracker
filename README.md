# Edostavka Price Tracker

A browser extension for automatically tracking price changes on edostavka.by. It stores price history in local storage and displays a price change chart directly on the product page.

**This is a third-party extension for tracking prices on edostavka.by. It is not an official Edostavka product.**

---

## Features

### Price Tracking
- Detects product pages and preview modal windows  
- Automatically saves prices to `chrome.storage.local`  
- Adds a new record only when the price actually changes 

### Price History Chart
- Builds charts using `Chart.js`
- Displays a popup mini-window directly on the product page  
- Correctly positions the chart relative to the price block and modal window  

### Store Interface Integration
- A button to display the chart appears next to the price  
- Dynamic creation and removal of elements using `MutationObserver`  
- Closes the popup when clicking outside of it  

### Extension Popup Interface
- List of all tracked products  
- Price change history with dates  
- Quick search by product ID  
- Navigate to a product by clicking  
- Delete a single record or the entire history  

---

## Technologies

- JavaScript
- WebExtensions API
- Chart.js
- chrome.storage.local
