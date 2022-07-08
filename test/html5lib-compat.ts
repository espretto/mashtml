import { Token, TokenType } from "../src/token.js";

/**
 * used to transform a mashtml token to an html5lib-tests token
 */
export function toTestToken(token: Token): TestToken {
  if (typeof token === "string") {
    return ["Character", token];
  }
  switch (token.type) {
    case TokenType.START_TAG: {
      return token.selfClosing
        ? ["StartTag", token.name, token.attrs, true]
        : ["StartTag", token.name, token.attrs];
    }
    case TokenType.END_TAG:
      return ["EndTag", token.name];
    case TokenType.DOCTYPE:
      return ["DOCTYPE", token.data, null, null, true];
    case TokenType.COMMENT:
      return ["Comment", token.data];
  }
}

/**
 * mutates token array by concatenating adjacent character tokens.
 */
export function coalesceAdjCharTokens(tokens: TestToken[]) {
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
