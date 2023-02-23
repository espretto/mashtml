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

const endOfTagName = /[/> \t\n\f]/g;

const endOfAttrName = /[=/> \t\n\f]/g;

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
      beforeAttrNameState(scanner, emit, createStartTag(tagName));

      if (tagName === "plaintext") {
        const data = scanner.readUntil(endOfFile);
        if (data) emit(cleanRawText(data));
      } else if (tagName === "script") {
        scriptDataState(scanner, emit);
      } else if (rcDataElements.has(tagName)) {
        rawDataState(scanner, emit, tagName, cleanRCDATA);
      } else if (rawTextElements.has(tagName)) {
        rawDataState(scanner, emit, tagName, cleanRawText);
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

function rawDataState(
  scanner: Scanner,
  emit: Emitter,
  tagName: string,
  clean: (input: string) => string
) {
  const pattern = `</${tagName}${endOfTagName.source}`;
  const appropriateEndTag = new RegExp(pattern, "gi");
  const match = scanner.search(appropriateEndTag);

  if (!match) {
    emit(clean(scanner.readUntil(endOfFile)));
  } else {
    appropriateEndTagState(scanner, emit, tagName, clean, match.index);
  }
}

function scriptDataState(scanner: Scanner, emit: Emitter) {
  const pattern = `</script${endOfTagName.source}|<!-{2,}(?!>)`;
  const endOfScriptData = new RegExp(pattern, "gi");
  const match = scanner.search(endOfScriptData);

  if (!match) {
    emit(cleanRawText(scanner.readUntil(endOfFile)));
  } else if (match[0].startsWith("</")) {
    appropriateEndTagState(scanner, emit, "script", cleanRawText, match.index);
  } else {
    emit(cleanRawText(scanner.readUntil(endOfScriptData.lastIndex)));
    scriptDataEscaped(scanner, emit);
  }
}

function scriptDataEscaped(scanner: Scanner, emit: Emitter) {
  const pattern = `</?script${endOfTagName.source}|-{2,}>`;
  const endOfEscapedScriptData = new RegExp(pattern, "gi");
  const match = scanner.search(endOfEscapedScriptData);

  if (!match) {
    emit(cleanRawText(scanner.readUntil(endOfFile)));
  } else if (match[0].startsWith("</")) {
    appropriateEndTagState(scanner, emit, "script", cleanRawText, match.index);
  } else if (match[0].startsWith("-")) {
    emit(cleanRawText(scanner.readUntil(endOfEscapedScriptData.lastIndex)));
    scriptDataState(scanner, emit); // susceptible to max recursion
  } else {
    // matched opening script tag
    emit(cleanRawText(scanner.readUntil(endOfEscapedScriptData.lastIndex)));
    scriptDataDoubleEscapeState(scanner, emit);
  }
}

function scriptDataDoubleEscapeState(scanner: Scanner, emit: Emitter) {
  const pattern = `</script${endOfTagName.source}|-{2,}>`;
  const endOfDoubleEscapedScriptData = new RegExp(pattern, "gi");
  const match = scanner.search(endOfDoubleEscapedScriptData);

  if (!match) {
    emit(cleanRawText(scanner.readUntil(endOfFile)));
  } else {
    const data = scanner.readUntil(endOfDoubleEscapedScriptData.lastIndex);
    emit(cleanRawText(data));

    if (match[0].startsWith("-")) {
      scriptDataState(scanner, emit); // susceptible to max recursion
    } else {
      scriptDataEscaped(scanner, emit); // susceptible to max recursion
    }
  }
}

function appropriateEndTagState(
  scanner: Scanner,
  emit: Emitter,
  tagName: string,
  clean: (input: string) => string,
  index: number
) {
  const data = scanner.readUntil(index);
  if (data) emit(clean(data));
  scanner.skip(`</${tagName}`.length);
  beforeAttrNameState(scanner, emit, createEndTag(tagName));
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
      emit(createDataToken(TokenType.COMMENT, ""));
      scanner.skip(1);
    } else if (scanner.startsWith("->")) {
      emit(createDataToken(TokenType.COMMENT, ""));
      scanner.skip(2);
    } else {
      const match = scanner.search(endOfComment) || scanner.search(endOfFile)!;
      const data = cleanComment(scanner.readUntil(match.index));
      emit(createDataToken(TokenType.COMMENT, data));
      scanner.skip(match[0].length);
    }
  } else if (scanner.startsWith("[CDATA[")) {
    const data = scanner.readUntil("]]>") + "]]";
    emit(createDataToken(TokenType.COMMENT, data));
    scanner.skip(3);
  } else if (scanner.startsWith("doctype", true)) {
    scanner.skip(7);
    const data = scanner.readUntil(">");
    scanner.skip(1);
    emit(createDataToken(TokenType.DOCTYPE, data));
  } else {
    bogusCommentState(scanner, emit);
  }
}
