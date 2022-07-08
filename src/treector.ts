import { Root, Element } from "hast";
import { createStartTag, Token, TokenType } from "./token.js";
import { tokenStream } from "./tokenizer.js";
import { htmlVoidElements } from "html-void-elements";

const voidElements = new Set(htmlVoidElements);

function last<T>(arr: ArrayLike<T>) {
  return arr[arr.length - 1];
}

function findLastIndex<T>(arr: ArrayLike<T>, predicate: (item: T) => boolean) {
  let i = arr.length;
  while (i-- && !predicate(arr[i]));
  return i;
}

export function tokenTree(html: string) {
  const root: Root = { type: "root", children: [] };
  const parents: (Root | Element)[] = [root];

  tokenStream(html, function emit(token: Token) {
    const parent = last(parents);

    if (typeof token === "string") {
      const prev = last(parent.children);
      if (prev?.type === "text") prev.value += token;
      else parent.children.push({ type: "text", value: token });
    } else if (token.type === TokenType.START_TAG) {
      const element: Element = {
        type: "element",
        tagName: token.name,
        properties: token.attrs,
        children: [],
      };
      parent.children.push(element);
      if (!voidElements.has(element.tagName)) parents.push(element);
    } else if (token.type === TokenType.END_TAG) {
      const i = findLastIndex(parents, (p) => p.tagName === token.name);
      if (i < 0) emit(createStartTag(token.name));
      else parents.length = i;
    } else if (token.type === TokenType.COMMENT) {
      parent.children.push({ type: "comment", value: token.data });
    } else if (token.type === TokenType.DOCTYPE) {
      if (parent !== root) throw new Error("cannot nest doctype tags");
      parent.children.push({
        type: "doctype",
        name: "",
        data: { raw: token.data },
      });
    }
  });

  return root;
}
