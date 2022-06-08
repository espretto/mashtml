declare module "*.test" {
  interface TestCase {
    description: string;
    input: string;
    output: string[];
    initialStates: string[];
    lastStartTag: string;
    errors: string[];
  }

  export const tests: TestCase[];
}
