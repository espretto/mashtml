
/**
 * used by jest to load html5lib-tests files (*.test containing JSON)
 * @see https://jestjs.io/docs/code-transformation#examples
 */
module.exports = {
  process: sourceText => ({ code: "module.exports = " + sourceText }),
};
