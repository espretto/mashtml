
/**
 * used by jest to load html5lib-tests files (*.test containing JSON)
 * @see https://jestjs.io/docs/code-transformation#examples
 */
export default {
  process: sourceText => ({ code: "export default " + sourceText }),
};
