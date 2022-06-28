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
  TagToken,
  Token,
  TokenType,
} from "./token.js";

const isLetter = RegExp.prototype.test.bind(/[a-zA-Z]/);

const endOfWhitespace = /[^ \t\n\f]/g;

const endOfTagName = /[\/> \t\n\f]/g;

const endOfAttrName = /[=\/> \t\n\f]/g;

const endOfAttrValue = /[> \t\n\f]/g;

const endOfComment = /--?!?$|--!?>/g;

const rcDataElements = new Set(["title", "textarea"]);

const rawDataTagNames = new Set([
  "iframe",
  "noembed",
  "noframes",
  "noscript",
  "plaintext",
  "script",
  "style",
  "xmp",
]);

export type Emitter = (token: Token) => void;

export function tokenStream(input: string, emit: Emitter) {
  const scanner = new Scanner(cleanInputStream(input));
  if (scanner.startsWith(BOM)) scanner.skip(BOM.length);
  dataState(scanner, emit);
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

    let chr = scanner.read();

    if (isLetter(chr)) {
      scanner.unread();
      tagNameState(scanner, emit, createStartTag());
    } else if (chr === "/") {
      const solidus = chr;
      chr = scanner.read();

      if (isLetter(chr)) {
        scanner.unread();
        tagNameState(scanner, emit, createEndTag());
      } else if (chr === ">") {
        // dropping invalid sequence </>
      } else if (chr) {
        scanner.unread();
        bogusCommentState(scanner, emit);
      } else {
        emit(chevron + solidus);
      }
    } else if (chr === "!") {
      markupDeclarationOpenState(scanner, emit);
    } else if (chr === "?") {
      scanner.unread();
      bogusCommentState(scanner, emit);
    } else {
      scanner.unread();
      emit(chevron);
    }
  }
}

function tagNameState(scanner: Scanner, emit: Emitter, tagToken: TagToken) {
  tagToken.name = cleanTagName(scanner.readUntil(endOfTagName));

  beforeAttrNameState(scanner, emit, tagToken);

  if (
    tagToken.type === TokenType.START_TAG &&
    (rawDataTagNames.has(tagToken.name) || rcDataElements.has(tagToken.name))
  ) {
    rawDataState(scanner, emit, tagToken);
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
      emit(tagToken);
      return;
    } else if (chr === "/") {
      chr = scanner.read();

      if (chr === ">") {
        tagToken.selfClosing = true;
        emit(tagToken);
        return;
      } else {
        scanner.unread();
        continue;
      }
    }

    // retrieve current attribute name, first character (current `chr`) may be [=]
    const attrName = cleanAttrName(chr + scanner.readUntil(endOfAttrName));
    const attr = [attrName, ""];

    // end tag attributes are dropped
    if (
      tagToken.type === TokenType.START_TAG &&
      !tagToken.attrs.some((attr) => attr[0] === attrName)
    ) {
      tagToken.attrs.push(attr);
    }

    scanner.skipUntil(endOfWhitespace);
    if (scanner.peek() !== "=") continue;
    scanner.skip(1);
    scanner.skipUntil(endOfWhitespace);

    chr = scanner.read();
    if (chr === "'" || chr === '"') {
      attr[1] = cleanAttrValue(scanner.readUntil(chr));
      scanner.skip(1);
    } else if (chr) {
      scanner.unread();
      attr[1] = cleanAttrValue(scanner.readUntil(endOfAttrValue));
    }
  }
}

function rawDataState(scanner: Scanner, emit: Emitter, tagToken: TagToken) {
  const clean = rcDataElements.has(tagToken.name) ? cleanRCDATA : cleanRawText;

  if (tagToken.name === "plaintext") {
    const data = scanner.readUntil(/$/g);
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

    if (scanner.peek() === ">") {
      emit(createDataToken(TokenType.COMMENT, ""));
      scanner.skip(1);
    } else {
      const match = scanner.search(endOfComment) || scanner.search(/$/g);
      const data = cleanComment(scanner.readUntil(match!.index));
      emit(createDataToken(TokenType.COMMENT, data));
      scanner.skip(match![0].length);
    }
  } else if (scanner.startsWith("[CDATA[")) {
    scanner.skip(7);
    const data = scanner.readUntil("]]>");
    emit(createDataToken(TokenType.CDATA, data));
    scanner.skip(3);
  } else if (scanner.startsWith("doctype", true)) {
    scanner.skip(7);
    const data = scanner.readUntil(">");
    emit(createDataToken(TokenType.DOCTYPE, data));
    scanner.skip(1);
  } else {
    bogusCommentState(scanner, emit);
  }
}
