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

  readUntil(search: string | RegExp) {
    if (typeof search === "string") {
      const i = this.input.indexOf(search, this.index);
      const nextIndex = i < 0 ? this.input.length : i;
      const chunk = this.input.substring(this.index, nextIndex);
      this.index = nextIndex;
      return chunk;
    }
    else {
      if (!search.global) throw new Error("missing global flag on regexp")
      search.lastIndex = this.index;
      const match = search.exec(this.input);
      const nextIndex = match ? match.index : this.input.length;
      const chunk = this.input.substring(this.index, nextIndex);
      this.index = nextIndex;
      return chunk;
    }
  }

  skip(n: number) {
    this.index += n;
  }

  skipUntil(search: string | RegExp) {
    if (typeof search === "string") {
      const i = this.input.indexOf(search, this.index);
      this.index = i < 0 ? this.input.length : i;
    }
    else {
      if (!search.global) throw new Error("missing global flag on regexp")
      search.lastIndex = this.index;
      const match = search.exec(this.input);
      this.index = match ? match.index : this.input.length;
    }
  }

  startsWith(search: string, ignoreCase?: boolean) {
    return ignoreCase
      ? this.input.substring(this.index, this.index + search.length).toLowerCase() === search.toLowerCase()
      : this.input.startsWith(search, this.index);
  }

  isEnd() {
    return this.index >= this.input.length;
  }
}
