chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openPopup") {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 500,
      height: 400
    });
  }
});
