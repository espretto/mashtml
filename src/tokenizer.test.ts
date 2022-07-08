import { tokenArray } from "./tokenizer.js";
import { createStartTag } from "./token.js";

describe("tokenizer", () => {
  it("should strip the BOM if there is one", () => {
    expect(tokenArray("\xEF\xBB\xBFtext")).toEqual(["text"]);
  });

  it("should tokenize plaintext token at EOF", () => {
    expect(tokenArray("<plaintext>")).toEqual([createStartTag("plaintext")]);
  });
});
