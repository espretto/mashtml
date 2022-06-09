import { tokenize } from "./tokenizer";
import test1 from "../html5lib-tests/tokenizer/test1.test";
import test2 from "../html5lib-tests/tokenizer/test2.test";
import test3 from "../html5lib-tests/tokenizer/test3.test";
import test4 from "../html5lib-tests/tokenizer/test4.test";
import { Token, TokenType } from "./token";

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
      const attrs: object = Object.fromEntries(token.attrs);
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
 * used to collect all tokens emitted into the expected test format, an array.
 */
function collectTokens(input: string) {
  const tokens: TestToken[] = [];

  tokenize(input, (token) => tokens.push(toTestToken(token)));

  let j = 0;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[j][0] === "Character" && tokens[i][0] === "Character") {
      tokens[j][1] += tokens[i][1];
    } else {
      tokens[++j] = tokens[i];
    }
  }

  tokens.length = Math.min(tokens.length, j + 1);

  return tokens;
}

const suites: Record<string, typeof test1.tests> = {
  "html5lib-tests/tokenizer/test1.test": test1.tests,
  "html5lib-tests/tokenizer/test2.test": test2.tests,
  "html5lib-tests/tokenizer/test3.test": test3.tests,
  "html5lib-tests/tokenizer/test4.test": test4.tests,
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
        const testOrSkip = initialStates || lastStartTag ? it.skip : it;

        // if (description !== "EOF in attribute name state") return;

        testOrSkip(description, () => {
          const actual = collectTokens(input);

          if (expected[0]?.[0] === "DOCTYPE") {
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
