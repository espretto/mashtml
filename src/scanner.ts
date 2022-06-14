/**
 * inspired by https://github.com/zzyyxxww/tokenz
 */
export default class Scanner {
  index: number;
  input: string;

  constructor(input: string) {
    this.index = 0;
    this.input = input;
  }

  peek() {
    return this.input.charAt(this.index);
  }

  read() {
    return this.input.charAt(this.index++);
  }

  unread() {
    this.index -= 1;
  }

  readUntil(terminator: number | string | RegExp): string {
    switch (typeof terminator) {
      case "number": {
        const chunk = this.input.substring(this.index, terminator);
        this.index = terminator;
        return chunk;
      }
      case "string": {
        const index = this.input.indexOf(terminator, this.index);
        return this.readUntil(index > -1 ? index : this.input.length);
      }
      default: {
        const match = this.search(terminator);
        return this.readUntil(match ? match.index : this.input.length);
      }
    }
  }

  skip(n: number) {
    this.index += n;
  }

  skipUntil(terminator: string | RegExp) {
    if (typeof terminator === "string") {
      const index = this.input.indexOf(terminator, this.index);
      this.index = index > -1 ? index : this.input.length;
    } else {
      const match = this.search(terminator);
      this.index = match ? match.index : this.input.length;
    }
  }

  search(needle: RegExp) {
    if (!needle.global) throw new Error("missing global flag on regexp");
    needle.lastIndex = this.index;
    return needle.exec(this.input);
  }

  startsWith(substring: string, ignoreCase?: boolean) {
    return ignoreCase
      ? this.input
          .substring(this.index, this.index + substring.length)
          .toLowerCase() === substring.toLowerCase()
      : this.input.startsWith(substring, this.index);
  }

  isEnd() {
    return this.index >= this.input.length;
  }
}
