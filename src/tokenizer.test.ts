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

  return tokens;
}

describe("test1", () => {
  test1.tests.forEach(({ description, input, output }) => {
    it(description, () => {
      const tokens = collectTokens(input);
      // console.log(description);
      expect(tokens).toEqual(output);
    });
  });
});

describe("test2", () => {
  test2.tests.forEach(({ description, input, output }) => {
    it(description, () => {
      const tokens = collectTokens(input);
      // console.log(description);
      expect(tokens).toEqual(output);
    });
  });
});

describe("test3", () => {
  test3.tests.forEach(({ description, input, output }) => {
    it(description, () => {
      const tokens = collectTokens(input);
      // console.log(description);
      expect(tokens).toEqual(output);
    });
  });
});

describe("test4", () => {
  test4.tests.forEach(({ description, input, output }) => {
    it(description, () => {
      const tokens = collectTokens(input);
      // console.log(description);
      expect(tokens).toEqual(output);
    });
  });
});
