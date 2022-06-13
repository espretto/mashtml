import { tokenize } from "./tokenizer";
import contentModelFlags from "../html5lib-tests/tokenizer/contentModelFlags.test";
import domjs from "../html5lib-tests/tokenizer/domjs.test";
import entities from "../html5lib-tests/tokenizer/entities.test";
import escapeFlag from "../html5lib-tests/tokenizer/escapeFlag.test";
import namedEntities from "../html5lib-tests/tokenizer/namedEntities.test";
import numericEntities from "../html5lib-tests/tokenizer/numericEntities.test";
import pendingSpecChanges from "../html5lib-tests/tokenizer/pendingSpecChanges.test";
import test1 from "../html5lib-tests/tokenizer/test1.test";
import test2 from "../html5lib-tests/tokenizer/test2.test";
import test3 from "../html5lib-tests/tokenizer/test3.test";
import test4 from "../html5lib-tests/tokenizer/test4.test";
import unicodeChars from "../html5lib-tests/tokenizer/unicodeChars.test";
import unicodeCharsProblematic from "../html5lib-tests/tokenizer/unicodeCharsProblematic.test";
import xmlViolation from "../html5lib-tests/tokenizer/xmlViolation.test";
import { Token, TokenType } from "./token";
import { reNamedCharacterReference } from "./namedCharRefs";

/**
 * @see https://github.com/html5lib/html5lib-tests/blob/master/tokenizer/README.md
 */
type TestToken =
  | ["DOCTYPE", string, string | null, string | null, boolean]
  | ["StartTag", string, object]
  | ["StartTag", string, object, boolean]
  | ["EndTag", string]
  | ["Comment", string]
  | ["Character", string];

/**
 * used to convert our token format to the expected test token format
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
 * used to collect all tokens emitted into the expected test format.
 */
function collectTokens(input: string) {
  const tokens: TestToken[] = [];
  tokenize(input, (token) => tokens.push(toTestToken(token)));
  return tokens;
}

/**
 * used to squash adjacent character tokens. this isn't included in the tokenizer
 * because it actually is part of the document-tree-builder.
 */
function squashAdjacentCharacterTokens(tokens: TestToken[]) {
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

const suites: Record<string, typeof test1.tests> = {
  "html5lib-tests/tokenizer/contentModelFlags.test": contentModelFlags.tests,
  "html5lib-tests/tokenizer/domjs.test": domjs.tests,
  "html5lib-tests/tokenizer/entities.test": entities.tests,
  "html5lib-tests/tokenizer/escapeFlag.test": escapeFlag.tests,
  "html5lib-tests/tokenizer/namedEntities.test": namedEntities.tests,
  "html5lib-tests/tokenizer/numericEntities.test": numericEntities.tests,
  "html5lib-tests/tokenizer/pendingSpecChanges.test": pendingSpecChanges.tests,
  "html5lib-tests/tokenizer/test1.test": test1.tests,
  "html5lib-tests/tokenizer/test2.test": test2.tests,
  "html5lib-tests/tokenizer/test3.test": test3.tests,
  "html5lib-tests/tokenizer/test4.test": test4.tests,
  "html5lib-tests/tokenizer/unicodeChars.test": unicodeChars.tests,
  "html5lib-tests/tokenizer/unicodeCharsProblematic.test":
    unicodeCharsProblematic.tests,
  "html5lib-tests/tokenizer/xmlViolation.test": xmlViolation.tests,
};

Object.entries(suites).forEach(([suite, tests]) => {
  describe(suite, () => {
    tests.forEach(
      ({
        description,
        input,
        output: expected,
        initialStates,
        lastStartTag,
      }) => {
        /**
         * skip 13.2.5.73 Named character reference state
         */
        const testOrSkip =
          initialStates || lastStartTag || reNamedCharacterReference.test(input)
            ? it.skip
            : it;

        testOrSkip(description, () => {
          const actual = collectTokens(input);
          squashAdjacentCharacterTokens(actual);

          if (
            expected[0]?.[0] === "DOCTYPE" ||
            expected[0]?.[0] === "Comment"
          ) {
            expect(actual).toHaveLength(expected.length);
            expect(actual[0][0]).toEqual(expected[0][0]);
          } else {
            expect(actual).toEqual(expected);
          }
        });
      }
    );
  });
});
