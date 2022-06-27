import { tokenize } from "../src/tokenizer";
import { createStartTag, type Token } from "../src/token";

const tokenarray = (input: string) => {
  const result: Token[] = [];
  tokenize(input, Array.prototype.push.bind(result));
  return result;
};

describe("tokenizer", () => {
  it("should strip the BOM if there is one", () => {
    expect(tokenarray("\xEF\xBB\xBFtext")).toEqual(["text"]);
  });

  it("should tokenize ending plaintext token", () => {
    expect(tokenarray("<plaintext>")).toEqual([createStartTag("plaintext")]);
  });
});
