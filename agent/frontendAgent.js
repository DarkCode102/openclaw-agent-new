module.exports = {
  buildUI: async (component) => {
    console.log(`🎨 [FrontendAgent] Mock rendering component: ${component}`);
    return `[Frontend] Rendered UI for ${component} successfully.`;
  }
};