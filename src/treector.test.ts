import { tokenTree } from "./treector.js";

describe("tokenTree", () => {
  it("should grow a beautiful tree", () => {
    const root = tokenTree("<!doctype><head><title>test</title></head>");

    expect(root).toEqual({
      type: "root",
      children: [
        {
          type: "doctype",
          name: "",
          data: { raw: "" },
        },
        {
          type: "element",
          tagName: "head",
          properties: {},
          children: [
            {
              type: "element",
              tagName: "title",
              properties: {},
              children: [
                {
                  type: "text",
                  value: "test",
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
