import { tokenArray } from "../src/tokenizer.js";
import { createStartTag } from "../src/token.js";

describe("tokenizer", () => {
  it("should strip the BOM if there is one", () => {
    expect(tokenArray("\xEF\xBB\xBFtext")).toEqual(["text"]);
  });

  it("should tokenize plaintext token at EOF", () => {
    expect(tokenArray("<plaintext>")).toEqual([createStartTag("plaintext")]);
  });
});
