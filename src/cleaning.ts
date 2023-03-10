/** used to be ignored/skipped before tokenizing */
export const BOM = "\xEF\xBB\xBF";

/** used to replace the NULL character */
const replacementChar = "\uFFFD";

/** used to map obsolete numeric html character references */
const obsoleteCharRefs: Record<string, string> = {
  "0": replacementChar,
  "128": "\u20AC", // EURO SIGN (€)
  "130": "\u201A", // SINGLE LOW-9 QUOTATION MARK (‚)
  "131": "\u0192", // LATIN SMALL LETTER F WITH HOOK (ƒ)
  "132": "\u201E", // DOUBLE LOW-9 QUOTATION MARK („)
  "133": "\u2026", // HORIZONTAL ELLIPSIS (…)
  "134": "\u2020", // DAGGER (†)
  "135": "\u2021", // DOUBLE DAGGER (‡)
  "136": "\u02C6", // MODIFIER LETTER CIRCUMFLEX ACCENT (ˆ)
  "137": "\u2030", // PER MILLE SIGN (‰)
  "138": "\u0160", // LATIN CAPITAL LETTER S WITH CARON (Š)
  "139": "\u2039", // SINGLE LEFT-POINTING ANGLE QUOTATION MARK (‹)
  "140": "\u0152", // LATIN CAPITAL LIGATURE OE (Œ)
  "142": "\u017D", // LATIN CAPITAL LETTER Z WITH CARON (Ž)
  "145": "\u2018", // LEFT SINGLE QUOTATION MARK (‘)
  "146": "\u2019", // RIGHT SINGLE QUOTATION MARK (’)
  "147": "\u201C", // LEFT DOUBLE QUOTATION MARK (“)
  "148": "\u201D", // RIGHT DOUBLE QUOTATION MARK (”)
  "149": "\u2022", // BULLET (•)
  "150": "\u2013", // EN DASH (–)
  "151": "\u2014", // EM DASH (—)
  "152": "\u02DC", // SMALL TILDE (˜)
  "153": "\u2122", // TRADE MARK SIGN (™)
  "154": "\u0161", // LATIN SMALL LETTER S WITH CARON (š)
  "155": "\u203A", // SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
  "156": "\u0153", // LATIN SMALL LIGATURE OE (œ)
  "158": "\u017E", // LATIN SMALL LETTER Z WITH CARON (ž)
  "159": "\u0178", // LATIN CAPITAL LETTER Y WITH DIAERESIS (Ÿ)
};

/** used to curry String.prototype.replace */
const createReplacer = (replacee: RegExp, replacer: any) => (str: string) =>
  str.replace(replacee, replacer);

/** used to replace all occurrences of the NULL character */
const replaceNullChars = createReplacer(/\x00/g, replacementChar);

/** used to normalize linebreaks */
const normalizeLinebreaks = createReplacer(/\r\n?/g, "\n");

/** used to lowercase ASCII characters only */
const toLowerASCII = createReplacer(/[A-Z]+/g, (chr: string) =>
  chr.toLowerCase()
);

/** used to replace numeric character references (13.2.5.72 Character reference state) */
const replaceNumCharRefs = createReplacer(
  /&#(\d+|x([\da-f]+));?/gi,
  (_: string, decimal: string, hexadecimal: string) => {
    const codePoint = hexadecimal ? parseInt(hexadecimal, 16) : Number(decimal);

    return codePoint in obsoleteCharRefs
      ? obsoleteCharRefs[codePoint]
      : (0xd800 <= codePoint && codePoint <= 0xdfff) || 0x10ffff < codePoint
      ? replacementChar
      : String.fromCodePoint(codePoint);
  }
);

export { replaceNullChars as cleanComment, replaceNullChars as cleanRawText };

export { replaceNumCharRefs as cleanText };

export const cleanTagName = (input: string) =>
  toLowerASCII(replaceNullChars(input));

export { cleanTagName as cleanAttrName };

export const cleanAttrValue = (input: string) =>
  replaceNumCharRefs(replaceNullChars(input));

export { cleanAttrValue as cleanRCDATA };

export { normalizeLinebreaks as cleanInputStream };
