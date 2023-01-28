import { tokenArray } from "../src/tokenizer.js";
import {
  coalesceAdjacentCharacterTokens,
  toTestToken,
} from "./html5lib-compat.js";
import { reNamedCharRef } from "./namedCharRefs.js";

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
    String.fromCharCode(parseInt(hex, 16))
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

// import contentModelFlags from "./html5lib-tests/tokenizer/contentModelFlags.test";
// import domjs from "./html5lib-tests/tokenizer/domjs.test";
// import entities from "./html5lib-tests/tokenizer/entities.test";
// import escapeFlag from "./html5lib-tests/tokenizer/escapeFlag.test";
// import numericEntities from "./html5lib-tests/tokenizer/numericEntities.test";
// import pendingSpecChanges from "./html5lib-tests/tokenizer/pendingSpecChanges.test";
import test1 from "./html5lib-tests/tokenizer/test1.test";
// import test2 from "./html5lib-tests/tokenizer/test2.test";
// import test3 from "./html5lib-tests/tokenizer/test3.test";
// import test4 from "./html5lib-tests/tokenizer/test4.test";
// import unicodeChars from "./html5lib-tests/tokenizer/unicodeChars.test";
// import unicodeCharsProblematic from "./html5lib-tests/tokenizer/unicodeCharsProblematic.test";
// "./html5lib-tests/tokenizer/namedEntities.test",
// "./html5lib-tests/tokenizer/xmlViolations.test",

Object.entries({
  // contentModelFlags,
  // domjs,
  // entities,
  // escapeFlag,
  // numericEntities,
  // pendingSpecChanges,
  test1,
  // test2,
  // test3,
  // test4,
  // unicodeChars,
  // unicodeCharsProblematic,
}).forEach(([suite, { tests }]) =>
  describe(suite, () =>
    tests.forEach((test) => {
      if (test.doubleEscaped) {
        test.doubleEscaped = false;
        test.input = unescape(test.input);
        test.output
          .filter(([type]) => type === "Character" || type === "Comment")
          .forEach((token) => (token[1] = unescape(token[1])));
      }

      if (
        involvesEscapedScriptData(test) ||
        involvesNamedCharacterReferences(test)
      ) {
        return it.skip(test.description, () => {});
      }

      const { initialStates = ["Data state"] } = test;
      initialStates.forEach((state) => runTest(test, state));
    })
  )
);

function runTest(test: TestCase, state: InitialState) {
  const { description, input, output: expected, lastStartTag } = test;

  const triggerTag = lastStartTag
    ? `<${lastStartTag}>`
    : lastStartTagMap[state];

  it(description, () => {
    // prepend state trigger
    const preparedInput = input ? triggerTag + input : input;
    const actual = tokenArray(preparedInput).map(toTestToken);

    if (triggerTag) {
      // remove state trigger
      const triggerToken = actual.shift();

      // re-emit cdata bogus comments as characters
      if (triggerToken && state === "CDATA section state") {
        actual.unshift(["Character", triggerToken[1].slice(7, -2)]);
      }
    }

    coalesceAdjacentCharacterTokens(actual);

    switch (expected[0]?.[0]) {
      case "DOCTYPE":
        // ease up test criteria for doctypes
        expect(actual).toHaveLength(expected.length);
        expect(actual[0][0]).toEqual(expected[0][0]);
        break;
      default:
        expect(actual).toEqual(expected);
    }
  });
}
