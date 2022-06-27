export enum TokenType {
  START_TAG,
  END_TAG,
  CDATA,
  DOCTYPE,
  COMMENT,
}

interface StartTag {
  type: TokenType.START_TAG;
  name: string;
  attrs: string[][];
  selfClosing: boolean;
}

export function createStartTag(name: string = ""): StartTag {
  return {
    type: TokenType.START_TAG,
    name,
    attrs: [],
    selfClosing: false,
  };
}

interface EndTag {
  type: TokenType.END_TAG;
  name: string;
  selfClosing: false;
}

export function createEndTag(name: string = ""): EndTag {
  return {
    type: TokenType.END_TAG,
    name,
    selfClosing: false,
  };
}

interface DataToken {
  type: TokenType.DOCTYPE | TokenType.COMMENT | TokenType.CDATA;
  data: string;
}

export function createDataToken(
  type: DataToken["type"],
  data: string
): DataToken {
  return { type, data };
}

export type TagToken = StartTag | EndTag;
export type Token = StartTag | EndTag | DataToken | string;
