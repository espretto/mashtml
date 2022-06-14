import { tokenize } from "./tokenizer";
import contentModelFlags from "../html5lib-tests/tokenizer/contentModelFlags.test";
import domjs from "../html5lib-tests/tokenizer/domjs.test";
import entities from "../html5lib-tests/tokenizer/entities.test";
import escapeFlag from "../html5lib-tests/tokenizer/escapeFlag.test";
import numericEntities from "../html5lib-tests/tokenizer/numericEntities.test";
import pendingSpecChanges from "../html5lib-tests/tokenizer/pendingSpecChanges.test";
import test1 from "../html5lib-tests/tokenizer/test1.test";
import test2 from "../html5lib-tests/tokenizer/test2.test";
import test3 from "../html5lib-tests/tokenizer/test3.test";
import test4 from "../html5lib-tests/tokenizer/test4.test";
import unicodeChars from "../html5lib-tests/tokenizer/unicodeChars.test";
import unicodeCharsProblematic from "../html5lib-tests/tokenizer/unicodeCharsProblematic.test";
import { Token, TokenType } from "./token";
import { reNamedCharacterReference } from "./namedCharRefs";
import { noop } from "./util";

/**
 * used to produce the expected test token format
 */
function toTestToken(token: Token): TestToken {
  if (typeof token === "string") {
    return ["Character", token];
  }
  switch (token.type) {
    case TokenType.START_TAG: {
      const attrs = Object.fromEntries(token.attrs);
      return token.selfClosing
        ? ["StartTag", token.name, attrs, true]
        : ["StartTag", token.name, attrs];
    }
    case TokenType.END_TAG:
      return ["EndTag", token.name];
    case TokenType.DOCTYPE:
      return ["DOCTYPE", token.data, null, null, true];
    case TokenType.COMMENT:
    case TokenType.CDATA:
      return ["Comment", token.data];
  }
}

/**
 * used to collect all tokens emitted
 */
function collectTokens(input: string) {
  const tokens: TestToken[] = [];
  tokenize(input, (token) => tokens.push(toTestToken(token)));
  return tokens;
}

/**
 * used to concatenate adjacent character tokens.
 */
function coalesceAdjacentCharacterTokens(tokens: TestToken[]) {
  let newIndex = 0;
  let oldIndex = 1;

  for (; oldIndex < tokens.length; oldIndex++) {
    if (
      tokens[newIndex][0] === "Character" &&
      tokens[oldIndex][0] === "Character"
    ) {
      tokens[newIndex][1] += tokens[oldIndex][1];
    } else {
      tokens[++newIndex] = tokens[oldIndex];
    }
  }

  tokens.length = Math.min(tokens.length, newIndex + 1);
}

/**
 * used to unescape double-escaped test cases
 */
function unescape(input: string) {
  return input.replace(/\\u([\da-f]{4})/gi, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
}

/**
 * used to preset tokenizer's initial state
 */
const initialStateMap: Record<InitialState, [string, boolean]> = {
  "Data state": ["", false],
  "PLAINTEXT state": ["<plaintext>", true],
  "RCDATA state": ["<title>", true],
  "RAWTEXT state": ["<style>", true],
  "Script data state": ["<script>", true],
  "CDATA section state": ["<![CDATA[", false],
};

const suites: Record<string, typeof test1.tests> = {
  "html5lib-tests/tokenizer/contentModelFlags.test": contentModelFlags.tests,
  "html5lib-tests/tokenizer/domjs.test": domjs.tests,
  "html5lib-tests/tokenizer/entities.test": entities.tests,
  "html5lib-tests/tokenizer/escapeFlag.test": escapeFlag.tests,
  "html5lib-tests/tokenizer/numericEntities.test": numericEntities.tests,
  "html5lib-tests/tokenizer/pendingSpecChanges.test": pendingSpecChanges.tests,
  "html5lib-tests/tokenizer/test1.test": test1.tests,
  "html5lib-tests/tokenizer/test2.test": test2.tests,
  "html5lib-tests/tokenizer/test3.test": test3.tests,
  "html5lib-tests/tokenizer/test4.test": test4.tests,
  "html5lib-tests/tokenizer/unicodeChars.test": unicodeChars.tests,
  "html5lib-tests/tokenizer/unicodeCharsProblematic.test":
    unicodeCharsProblematic.tests,
  // "html5lib-tests/tokenizer/namedEntities.test": namedEntities.tests, // not tested
  // "html5lib-tests/tokenizer/xmlViolations.test": namedEntities.xmlViolationTests, // not tested
};

Object.entries(suites).forEach(([suite, tests]) => {
  describe(suite, () => tests.forEach(testCase));
});

function testCase({
  description,
  doubleEscaped,
  input,
  output: expected,
  initialStates = ["Data state"],
  lastStartTag,
}: TestCase) {
  if (doubleEscaped) {
    input = unescape(input);
    expected
      .filter(([type]) => type === "Character")
      .forEach((token) => (token[1] = unescape(token[1])));
  }

  if (reNamedCharacterReference.test(input)) {
    return it.skip(description, noop);
  }

  initialStates.forEach((initialState) => {
    if (initialState === "Script data state") {
      if (input.includes("</script>")) {
        return it.skip(description, noop);
      }
    }

    const [stateTrigger, isTag] = lastStartTag
      ? [`<${lastStartTag}>`, true]
      : initialStateMap[initialState];

    it(description, () => {
      const actual = collectTokens(stateTrigger + input);

      if (isTag || !input) {
        actual.shift();
      } else if (initialState === "CDATA section state") {
        actual[0][0] = "Character";
      }

      coalesceAdjacentCharacterTokens(actual);

      if (expected[0]?.[0] === "DOCTYPE" || expected[0]?.[0] === "Comment") {
        expect(actual).toHaveLength(expected.length);
        expect(actual[0][0]).toEqual(expected[0][0]);
      } else {
        expect(actual).toEqual(expected);
      }
    });
  });
}
