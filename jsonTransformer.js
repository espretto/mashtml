module.exports = {
  process(sourceText, sourcePath, options) {
    return {
      code: "module.exports = " + sourceText,
    };
  },
};