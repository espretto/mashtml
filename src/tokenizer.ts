import {
  bom,
  cleanAttrName,
  cleanAttrValue,
  cleanComment,
  cleanInputStream,
  cleanRawText,
  cleanRCDATA,
  cleanTagName,
  cleanText,
} from "./cleaning";
import Scanner from "./scanner";
import {
  createDataToken,
  createEndTag,
  createStartTag,
  TagToken,
  Token,
  TokenType,
} from "./token";

/** used as test for an ASCII character */
const isLetter = RegExp.prototype.test.bind(/[a-zA-Z]/);

const endOfWhitespace = /[^ \t\n\f]/g;

const endOfTagName = /[\/> \t\n\f]/g;

const endOfAttrName = /[=\/> \t\n\f]/g;

const endOfAttrValue = /[> \t\n\f]/g;

const endOfComment = /--!?>/g;

/** used to flag whether or not to transform numeric html character references */
const rcDataElements = new Set(["title", "textarea"]);

/** used to switch the parser state to the RCDATA, RAWTEXT or script-data state */
const rawDataTagNames = new Set([
  ...rcDataElements,
  "iframe",
  "noembed",
  "noframes",
  "noscript",
  "plaintext",
  "script",
  "style",
  "xmp",
]);

type Emitter = (token: Token) => void;

export function tokenize(input: string, emit: Emitter) {
  // 13.2.3.5 Preprocessing the input stream
  const scanner = new Scanner(cleanInputStream(input));

  if (scanner.startsWith(bom)) scanner.skip(bom.length);

  dataState(scanner, emit);
}

function dataState(scanner: Scanner, emit: Emitter) {
  // 13.2.5.1 Data state
  while (!scanner.isEnd()) {
    const text = scanner.readUntil("<");
    if (text) emit(cleanText(text));

    // >>> 12.2.4.6 Tag open state ---------------------------------------------
    const chevron = scanner.read();
    if (!chevron) return;

    let chr = scanner.read();

    if (isLetter(chr)) {
      scanner.unread();
      tagNameState(scanner, emit, createStartTag());
    } else if (chr === "/") {
      // >>> 12.2.4.7 End tag open state ---------------------------------------
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
      // <<< 12.2.4.7 End tag open state ---------------------------------------
    } else if (chr === "!") {
      markupDeclarationOpenState(scanner, emit);
    } else if (chr === "?") {
      scanner.unread();
      bogusCommentState(scanner, emit);
    } else {
      scanner.unread();
      emit(chevron);
    }
    // <<< 12.2.4.6 Tag open state ---------------------------------------------
  }
}

function tagNameState(scanner: Scanner, emit: Emitter, tagToken: TagToken) {
  // >>> 12.2.4.8 Tag name state -----------------------------------------------
  tagToken.name = cleanTagName(scanner.readUntil(endOfTagName));
  // <<< 12.2.4.8 Tag name state -----------------------------------------------

  beforeAttrNameState(scanner, emit, tagToken);

  if (
    tagToken.type === TokenType.START_TAG &&
    rawDataTagNames.has(tagToken.name)
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
    // >>> 12.2.4.32 Before attribute name state -------------------------------
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
    // <<< 12.2.4.32 Before attribute name state
    // -------------------------------------------------------------------------
    // >>> 12.2.4.33 Attribute name state

    // retrieve current attribute name, first character (current `chr`) may be [=]
    const attrName = cleanAttrName(chr + scanner.readUntil(endOfAttrName));
    const attr = [attrName, ""];

    // create and, if new to the start tag token, register the attribute.
    // attributes for end tag tokens will be parsed but never registered.
    if (
      tagToken.type === TokenType.START_TAG &&
      !tagToken.attrs.some((attr) => attr[0] === attrName)
    ) {
      tagToken.attrs.push(attr);
    }

    // <<< 12.2.4.33 Attribute name state
    // -------------------------------------------------------------------------
    // >>> 12.2.4.34 After attribute name state

    scanner.skipUntil(endOfWhitespace);
    if (scanner.peek() !== "=") continue;

    // <<< 12.2.4.34 After attribute name state
    // -------------------------------------------------------------------------
    // >>> 12.2.4.35 Before attribute value state

    scanner.skip(1);
    scanner.skipUntil(endOfWhitespace);

    // <<< 12.2.4.35 Before attribute value state
    // -------------------------------------------------------------------------

    chr = scanner.read();
    if (chr === "'" || chr === '"') {
      // >>> 12.2.4.36/37 Attribute value (double-/single-quoted) state
      attr[1] = cleanAttrValue(scanner.readUntil(chr));
      scanner.skip(1);
      // <<< 12.2.4.36/37 Attribute value (double-/single-quoted) state
    } else if (chr) {
      // >>> 12.2.4.38 Attribute value (unquoted) state
      scanner.unread();
      attr[1] = cleanAttrValue(scanner.readUntil(endOfAttrValue));
      // <<< 12.2.4.38 Attribute value (unquoted) state --------------------------
    }
  }
}

/**
 * 12.2.4.2 RCDATA state
 * 12.2.4.3 RAWTEXT state
 * 12.2.4.4 Script data state
 * 12.2.4.5 PLAINTEXT data state
 *
 * 12.2.4.9 RCDATA less-than sign state
 * 12.2.4.10 RCDATA end tag open state
 * 12.2.4.11 RCDATA end tag name state
 *
 * 12.2.4.12 RAWTEXT less-than sign state
 * 12.2.4.13 RAWTEXT end tag open state
 * 12.2.4.14 RAWTEXT end tag name state
 *
 * 12.2.4.15 Script data less-than sign state
 * 12.2.4.16 Script data end tag open state
 * 12.2.4.17 Script data end tag name state
 *
 * ! 12.2.4.18 Script data escape start state
 * ! 12.2.4.19 Script data escape start dash state
 * ! 12.2.4.20 Script data escaped state
 * ! 12.2.4.21 Script data escaped dash state
 * ! 12.2.4.22 Script data escaped dash dash state
 * ! 12.2.4.23 Script data escaped less-than sign state
 * ! 12.2.4.24 Script data escaped end tag open state
 * ! 12.2.4.25 Script data escaped end tag name state
 * ! 12.2.4.26 Script data double escape start state
 * ! 12.2.4.27 Script data double escaped state
 * ! 12.2.4.28 Script data double escaped dash state
 * ! 12.2.4.29 Script data double escaped dash dash state
 * ! 12.2.4.30 Script data double escaped less-than sign state
 * ! 12.2.4.31 Script data double escape end state
 *
 * mark:
 *   the similarity of states
 *
 * related:
 *   12.1.2.6 Restrictions on the contents of raw text and escapable raw text elements
 */
function rawDataState(scanner: Scanner, emit: Emitter, tagToken: TagToken) {
  const clean = rcDataElements.has(tagToken.name) ? cleanRCDATA : cleanRawText;

  if (tagToken.name === "plaintext") {
    const data = scanner.readUntil(/$/g);
    if (data) emit(clean(data));
  } else {
    const endTagMatcher = new RegExp(`</${tagToken.name}[/> \t\n\f]`, "gi");
    const data = scanner.readUntil(endTagMatcher);
    if (data) emit(clean(data));
  }
}

/**
 * 12.2.4.41 Bogus comment state
 */
function bogusCommentState(scanner: Scanner, emit: Emitter) {
  const data = cleanComment(scanner.readUntil(">"));
  emit(createDataToken(TokenType.COMMENT, data));
  scanner.skip(1);
}

/**
 * 12.2.4.42 Markup declaration open state
 * 12.2.4.43 Comment start state
 * 12.2.4.44 Comment start dash state
 * 12.2.4.45 Comment state
 * 12.2.4.46 Comment end dash state
 * 12.2.4.47 Comment end state
 * 12.2.4.48 Comment end bang state
 *
 * parses a doctype declaration but treats its internals as arbitrary data,
 * much like the contents of a CDATA-section.
 *
 * all of the below states emit the token and return to the 12.2.4.52 data state
 * if either U+003E GREATER-THAN SIGN (>) or EOF is encountered.
 * this is the exact behaviour of `readUntil` so there are no side-effects,
 * not even those the doctype might have on the behaviour of the parser!
 *
 * ! 12.2.4.49 DOCTYPE state
 * ! 12.2.4.50 Before DOCTYPE name state
 * ! 12.2.4.51 DOCTYPE name state
 * ! 12.2.4.52 After DOCTYPE name state
 * ! 12.2.4.53 After DOCTYPE public keyword state
 * ! 12.2.4.54 Before DOCTYPE public identifier state
 * ! 12.2.4.55 DOCTYPE public identifier (double-quoted) state
 * ! 12.2.4.56 DOCTYPE public identifier (single-quoted) state
 * ! 12.2.4.57 After DOCTYPE public identifier state
 * ! 12.2.4.58 Between DOCTYPE public and system identifiers state
 * ! 12.2.4.59 After DOCTYPE system keyword state
 * ! 12.2.4.60 Before DOCTYPE system identifier state
 * ! 12.2.4.61 DOCTYPE system identifier (double-quoted) state
 * ! 12.2.4.62 DOCTYPE system identifier (single-quoted) state
 * ! 12.2.4.63 After DOCTYPE system identifier state
 * ! 12.2.4.64 Bogus DOCTYPE state
 *
 * instead of emitting character tokens, CDATA-section contents are grouped
 * and emitted as part of a non-spec-conforming CDATA-token.
 *
 * 12.2.4.65 CDATA section state
 * 12.2.4.66 CDATA section bracket state
 * 12.2.4.67 CDATA section end state
 */
function markupDeclarationOpenState(scanner: Scanner, emit: Emitter) {
  if (scanner.startsWith("--")) {
    scanner.skip(2);
    const data = cleanComment(scanner.readUntil(endOfComment));
    emit(createDataToken(TokenType.COMMENT, data));
    scanner.skipUntil(">");
    scanner.skip(1);
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
