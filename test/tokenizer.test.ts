import { tokenize } from "../src/tokenizer";
import { createStartTag, type Token } from "../src/token";

describe("tokenizer", () => {
  it("should strip the BOM if there is one", () => {
    expect(tokenize("\xEF\xBB\xBFtext")).toEqual(["text"]);
  });

  it("should tokenize ending plaintext token", () => {
    expect(tokenize("<plaintext>")).toEqual([createStartTag("plaintext")]);
  });
});
