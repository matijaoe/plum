export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await browser.tabs.sendMessage(tab.id, { type: "activate-reader" });
    }
  });
});
