/**
 * type declarations for contents of html5lib-tests files
 * @see https://github.com/html5lib/html5lib-tests/blob/master/tokenizer/README.md
 */
type InitialState =
  | "Data state"
  | "PLAINTEXT state"
  | "RCDATA state"
  | "RAWTEXT state"
  | "Script data state"
  | "CDATA section state";

type TestToken =
  | ["DOCTYPE", string, string | null, string | null, boolean]
  | ["StartTag", string, object]
  | ["StartTag", string, object, true]
  | ["EndTag", string]
  | ["Comment", string]
  | ["Character", string];

interface TestCase {
  description: string;
  doubleEscaped?: boolean;
  input: string;
  output: TestToken[];
  initialStates?: InitialState[];
  lastStartTag?: string;
  errors?: string[];
}

declare module "*.test" {
  export const tests: TestCase[];
}
