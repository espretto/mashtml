import { tokenize } from "../src/tokenizer";
import { coalesceAdjCharTokens, toTestToken } from "./html5lib-compat";
import { reNamedCharRef } from "./namedCharRefs";

/**
 * used to transition to the test's initial tokenizer state
 */
const lastStartTagMap: Record<InitialState, string> = {
  "Data state": "",
  "PLAINTEXT state": "<plaintext>",
  "RCDATA state": "<title>",
  "RAWTEXT state": "<style>",
  "Script data state": "<script>",
  "CDATA section state": "<![CDATA[",
};

/**
 * used to unescape double-escaped test cases
 */
function unescape(input: string) {
  return input.replace(/\\u([\da-f]{4})/gi, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
}

/**
 * used to detect test cases involving escaped script data
 */
function involvesEscapedScriptData({ input, initialStates }: TestCase) {
  return input.includes("<!--") && initialStates?.includes("Script data state");
}

/**
 * used to detect test cases involving named character references
 */
function involvesNamedCharacterReferences({ input }: TestCase) {
  return reNamedCharRef.test(input);
}

const suites = [
  "./html5lib-tests/tokenizer/contentModelFlags.test",
  "./html5lib-tests/tokenizer/domjs.test",
  "./html5lib-tests/tokenizer/entities.test",
  "./html5lib-tests/tokenizer/escapeFlag.test",
  "./html5lib-tests/tokenizer/numericEntities.test",
  "./html5lib-tests/tokenizer/pendingSpecChanges.test",
  "./html5lib-tests/tokenizer/test1.test",
  "./html5lib-tests/tokenizer/test2.test",
  "./html5lib-tests/tokenizer/test3.test",
  "./html5lib-tests/tokenizer/test4.test",
  "./html5lib-tests/tokenizer/unicodeChars.test",
  "./html5lib-tests/tokenizer/unicodeCharsProblematic.test",
  // "./html5lib-tests/tokenizer/namedEntities.test",
  // "./html5lib-tests/tokenizer/xmlViolations.test",
];

suites.forEach(suite => {
  const tests = require(suite).tests as TestCase[];

  describe(suite, () =>
    tests.forEach(test => {
      if (test.doubleEscaped) {
        test.doubleEscaped = false;
        test.input = unescape(test.input);
        test.output
          .filter(([type]) => type === "Character")
          .forEach(token => (token[1] = unescape(token[1])));
      }

      if (
        involvesEscapedScriptData(test) ||
        involvesNamedCharacterReferences(test)
      ) {
        return it.skip(test.description, () => {});
      }

      const { initialStates = ["Data state"] } = test;
      initialStates.forEach(state => runTest(test, state));
    })
  );
});

function runTest(test: TestCase, state: InitialState) {
  const { description, input, output: expected, lastStartTag } = test;

  const triggerTag = lastStartTag
    ? `<${lastStartTag}>`
    : lastStartTagMap[state];

  it(description, () => {
    // prepend state trigger
    const preparedInput = input ? triggerTag + input : input;
    const actual = tokenize(preparedInput).map(toTestToken);

    if (triggerTag) {
      // remove state trigger
      const triggerToken = actual.shift();

      // re-emit CDATA contents as character tokens as is expected by the tests
      if (triggerToken && state === "CDATA section state") {
        actual.unshift(["Character", triggerToken[1]]);
      }
    }

    coalesceAdjCharTokens(actual);

    switch (expected[0]?.[0]) {
      case "Comment":
      case "DOCTYPE":
        // ease up test criteria for doctypes, comments and CDATA sections.
        // while they must consume the same amount of characters, do not expect
        // them to have been processed any further
        expect(actual).toHaveLength(expected.length);
        expect(actual[0][0]).toEqual(expected[0][0]);
        break;
      default:
        expect(actual).toEqual(expected);
    }
  });
}
