import { tokenize } from "./tokenizer";
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
 * used to preset tokenizer's initial state
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

function involvesEscapedScriptData({ input, initialStates }: TestCase) {
  return input.includes("<!--") && initialStates?.includes("Script data state");
}

function involvesNamedCharacterReferences({ input }: TestCase) {
  return reNamedCharacterReference.test(input);
}

function unescape(input: string) {
  return input.replace(/\\u([\da-f]{4})/gi, (_, hex) =>
    String.fromCodePoint(parseInt(hex, 16))
  );
}

/**
 * used to unescape double-escaped test cases
 */
function unescapeTest(test: TestCase): TestCase {
  if (!test.doubleEscaped) return test;

  return {
    ...test,
    doubleEscaped: false,
    input: unescape(test.input),
    output: test.output.map((token) =>
      token[0] === "Character" ? ["Character", unescape(token[1])] : token
    ),
  };
}

const suites = [
  "../html5lib-tests/tokenizer/contentModelFlags.test",
  "../html5lib-tests/tokenizer/domjs.test",
  "../html5lib-tests/tokenizer/entities.test",
  "../html5lib-tests/tokenizer/escapeFlag.test",
  "../html5lib-tests/tokenizer/numericEntities.test",
  "../html5lib-tests/tokenizer/pendingSpecChanges.test",
  "../html5lib-tests/tokenizer/test1.test",
  "../html5lib-tests/tokenizer/test2.test",
  "../html5lib-tests/tokenizer/test3.test",
  "../html5lib-tests/tokenizer/test4.test",
  "../html5lib-tests/tokenizer/unicodeChars.test",
  "../html5lib-tests/tokenizer/unicodeCharsProblematic.test",
  // "../html5lib-tests/tokenizer/namedEntities.test",
  // "../html5lib-tests/tokenizer/xmlViolations.test",
];

suites.forEach((suite) =>
  describe(suite, () =>
    (require(suite).tests as TestCase[]).map(unescapeTest).forEach(runTest)
  )
);

function runTest(test: TestCase) {
  if (
    involvesEscapedScriptData(test) ||
    involvesNamedCharacterReferences(test)
  ) {
    return it.skip(test.description, noop);
  }

  const { initialStates = ["Data state"] } = test;
  initialStates.forEach((initialState) => runTestInState(test, initialState));
}

function runTestInState(test: TestCase, initialState: InitialState) {
  const { description, input, output: expected, lastStartTag } = test;

  // set initial tokenizer state by prepending the corresponding tag
  const trigger = lastStartTag
    ? `<${lastStartTag}>`
    : lastStartTagMap[initialState];

  it(description, () => {
    const actual = collectTokens(input ? trigger + input : input);

    // remove prepended tag triggering the initial tokenizer state
    if (trigger) {
      const triggerToken = actual.shift();

      // re-emit CDATA content as character tokens
      if (triggerToken && initialState === "CDATA section state") {
        actual.unshift(["Character", triggerToken[1]]);
      }
    }

    coalesceAdjacentCharacterTokens(actual);

    // loosen test criteria for doctype and comment rules
    const expectedType = expected[0]?.[0];
    if (expectedType === "DOCTYPE" || expectedType === "Comment") {
      expect(actual).toHaveLength(expected.length);
      expect(actual[0][0]).toEqual(expectedType);
    } else {
      expect(actual).toEqual(expected);
    }
  });
}
