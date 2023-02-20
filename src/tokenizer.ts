import {
  BOM,
  cleanAttrName,
  cleanAttrValue,
  cleanComment,
  cleanInputStream,
  cleanRawText,
  cleanRCDATA,
  cleanTagName,
  cleanText,
} from "./cleaning.js";
import Scanner from "./scanner.js";
import {
  createDataToken,
  createEndTag,
  createStartTag,
  StartTag,
  TagToken,
  Token,
  TokenType,
} from "./token.js";

const isLetter = RegExp.prototype.test.bind(/[a-zA-Z]/);

const endOfWhitespace = /[^ \t\n\f]/g;

const endOfTagName = /[\/> \t\n\f]/g;

const endOfAttrName = /[=\/> \t\n\f]/g;

const endOfAttrValue = /[> \t\n\f]/g;

const endOfComment = /--?$|--!?(?:>|$)/g;

const endOfFile = /$/g;

const rcDataElements = new Set(["title", "textarea"]);

const rawTextElements = new Set([
  "iframe",
  "noembed",
  "noframes",
  "noscript",
  "style",
  "xmp",
]);

/** used to ignore attributes w/o flow control changes */
let ignoredAttrs: StartTag["attrs"] = {};

export type Emitter = (token: Token) => void;

export function tokenStream(input: string, emit: Emitter) {
  const scanner = new Scanner(cleanInputStream(input));
  if (scanner.startsWith(BOM)) scanner.skip(BOM.length);
  dataState(scanner, emit);
  ignoredAttrs = {};
}

export function tokenArray(input: string) {
  const tokens: Token[] = [];
  tokenStream(input, Array.prototype.push.bind(tokens));
  return tokens;
}

function dataState(scanner: Scanner, emit: Emitter) {
  while (!scanner.isEnd()) {
    const text = scanner.readUntil("<");
    if (text) emit(cleanText(text));

    const chevron = scanner.read();
    if (!chevron) return;

    let chr = scanner.peek();

    if (isLetter(chr)) {
      const tagName = cleanTagName(scanner.readUntil(endOfTagName));
      const tagToken = createStartTag(tagName);
      beforeAttrNameState(scanner, emit, tagToken);

      if (tagName === "plaintext") {
        const data = scanner.readUntil(endOfFile);
        if (data) emit(cleanRawText(data));
      } else if (tagName === "script") {
        scriptDataState(scanner, emit, tagToken);
      } else if (rcDataElements.has(tagName)) {
        rawDataState(scanner, emit, tagToken, cleanRCDATA);
      } else if (rawTextElements.has(tagName)) {
        rawDataState(scanner, emit, tagToken, cleanRawText);
      }
    } else if (chr === "/") {
      const solidus = chr;
      scanner.skip(1);
      chr = scanner.peek();

      if (isLetter(chr)) {
        const tagName = cleanTagName(scanner.readUntil(endOfTagName));
        beforeAttrNameState(scanner, emit, createEndTag(tagName));
      } else if (chr === ">") {
        scanner.skip(1); // skipping invalid sequence </>
      } else if (chr) {
        bogusCommentState(scanner, emit);
      } else {
        emit(chevron + solidus);
      }
    } else if (chr === "!") {
      scanner.skip(1);
      markupDeclarationOpenState(scanner, emit);
    } else if (chr === "?") {
      bogusCommentState(scanner, emit);
    } else {
      emit(chevron);
    }
  }
}

function beforeAttrNameState(
  scanner: Scanner,
  emit: Emitter,
  tagToken: TagToken
) {
  while (!scanner.isEnd()) {
    scanner.skipUntil(endOfWhitespace);
    let chr = scanner.read();

    if (chr === ">") {
      return emit(tagToken);
    } else if (chr === "/") {
      if (scanner.peek() !== ">") continue;
      scanner.skip(1);
      tagToken.selfClosing = true;
      return emit(tagToken);
    }

    // retrieve current attribute name, first character (current `chr`) may be [=]
    const attrName = cleanAttrName(chr + scanner.readUntil(endOfAttrName));

    // ignore duplicate start tag attributes and all end tag attributes
    const attrs =
      tagToken.type === TokenType.END_TAG || attrName in tagToken.attrs
        ? ignoredAttrs
        : tagToken.attrs;

    attrs[attrName] = "";

    scanner.skipUntil(endOfWhitespace);
    if (scanner.peek() !== "=") continue;
    scanner.skip(1);
    scanner.skipUntil(endOfWhitespace);

    chr = scanner.peek();
    if (chr === "'" || chr === '"') {
      scanner.skip(1);
      attrs[attrName] = cleanAttrValue(scanner.readUntil(chr));
      scanner.skip(1);
    } else if (chr) {
      attrs[attrName] = cleanAttrValue(scanner.readUntil(endOfAttrValue));
    }
  }
}

function rawDataState(scanner: Scanner, emit: Emitter, tagToken: TagToken) {
  const clean = rcDataElements.has(tagToken.name) ? cleanRCDATA : cleanRawText;

  if (tagToken.name === "plaintext") {
    const data = scanner.readUntil(endOfFile);
    if (data) emit(clean(data));
  } else {
    const pattern = "</" + tagToken.name + endOfTagName.source;
    const data = scanner.readUntil(new RegExp(pattern, "gi"));
    if (data) emit(clean(data));
    beforeAttrNameState(scanner, emit, createEndTag(tagToken.name));
  }
}

function bogusCommentState(scanner: Scanner, emit: Emitter) {
  const data = cleanComment(scanner.readUntil(">"));
  emit(createDataToken(TokenType.COMMENT, data));
  scanner.skip(1);
}

function markupDeclarationOpenState(scanner: Scanner, emit: Emitter) {
  if (scanner.startsWith("--")) {
    scanner.skip(2);

    if (scanner.startsWith(">")) {
      scanner.skip(1);
      emit(createDataToken(TokenType.COMMENT, ""));
    } else if (scanner.startsWith("->")) {
      scanner.skip(2);
      emit(createDataToken(TokenType.COMMENT, ""));
    } else {
      const match = scanner.search(endOfComment) || scanner.search(endOfFile)!;
      const data = cleanComment(scanner.readUntil(match.index));
      scanner.skip(match[0].length);
      emit(createDataToken(TokenType.COMMENT, data));
    }
  } else if (scanner.startsWith("[CDATA[")) {
    const data = scanner.readUntil("]]>") + "]]";
    scanner.skip(3);
    emit(createDataToken(TokenType.COMMENT, data));
  } else if (scanner.startsWith("doctype", true)) {
    scanner.skip(7);
    const data = scanner.readUntil(">");
    scanner.skip(1);
    emit(createDataToken(TokenType.DOCTYPE, data));
  } else {
    bogusCommentState(scanner, emit);
  }
}
