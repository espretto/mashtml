# mashtml

_mashtml_ - sufficiently compliant tokenizer with a small footprint.

## Use cases

- sanitization
- inspection
- validation
- templating

## Quick Start

mashtml is a [pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

```js
import { tokenStream, tokenArray } from "mashtml";

// handle tokens one by one
tokenStream(`<a href="#h1">top</a>`, console.log);

// or collect tokens in an array
const tokens = tokenArray(`<a href="#h1">top</a>`);
```

## Compliance

This is a specialized tokenizer. It is compliant with the HTML5 specification to the extend that is reasonable for its use case. Specifically, chapter [13.2.5&nbsp;Tokenization](https://html.spec.whatwg.org/#tokenization) outlines the parser states of which the following have been implemented.

- [x] 13.2.5.1 Data state
- [x] 13.2.5.2 RCDATA state
- [x] 13.2.5.3 RAWTEXT state
- [x] 13.2.5.4 Script data state
- [x] 13.2.5.5 PLAINTEXT state
- [x] 13.2.5.6 Tag open state
- [x] 13.2.5.7 End tag open state
- [x] 13.2.5.8 Tag name state
- [x] 13.2.5.9 RCDATA less-than sign state
- [x] 13.2.5.10 RCDATA end tag open state
- [x] 13.2.5.11 RCDATA end tag name state
- [x] 13.2.5.12 RAWTEXT less-than sign state
- [x] 13.2.5.13 RAWTEXT end tag open state
- [x] 13.2.5.14 RAWTEXT end tag name state
- [x] 13.2.5.15 Script data less-than sign state
- [x] 13.2.5.16 Script data end tag open state
- [x] 13.2.5.17 Script data end tag name state
- [x] 13.2.5.18 Script data escape start state
- [x] 13.2.5.19 Script data escape start dash state
- [x] 13.2.5.20 Script data escaped state
- [x] 13.2.5.21 Script data escaped dash state
- [x] 13.2.5.22 Script data escaped dash dash state
- [x] 13.2.5.23 Script data escaped less-than sign state
- [x] 13.2.5.24 Script data escaped end tag open state
- [x] 13.2.5.25 Script data escaped end tag name state
- [x] 13.2.5.26 Script data double escape start state
- [x] 13.2.5.27 Script data double escaped state
- [x] 13.2.5.28 Script data double escaped dash state
- [x] 13.2.5.29 Script data double escaped dash dash state
- [x] 13.2.5.30 Script data double escaped less-than sign state
- [x] 13.2.5.31 Script data double escape end state
- [x] 13.2.5.32 Before attribute name state
- [x] 13.2.5.33 Attribute name state
- [x] 13.2.5.34 After attribute name state
- [x] 13.2.5.35 Before attribute value state
- [x] 13.2.5.36 Attribute value (double-quoted) state
- [x] 13.2.5.37 Attribute value (single-quoted) state
- [x] 13.2.5.38 Attribute value (unquoted) state
- [x] 13.2.5.39 After attribute value (quoted) state
- [x] 13.2.5.40 Self-closing start tag state
- [x] 13.2.5.41 Bogus comment state
- [x] 13.2.5.42 Markup declaration open state
- [x] 13.2.5.43 Comment start state
- [x] 13.2.5.44 Comment start dash state
- [x] 13.2.5.45 Comment state
- [x] 13.2.5.46 Comment less-than sign state
- [x] 13.2.5.47 Comment less-than sign bang state
- [x] 13.2.5.48 Comment less-than sign bang dash state
- [x] 13.2.5.49 Comment less-than sign bang dash dash state
- [x] 13.2.5.50 Comment end dash state
- [x] 13.2.5.51 Comment end state
- [x] 13.2.5.52 Comment end bang state
- [x] 13.2.5.53 DOCTYPE state
- [ ] 13.2.5.54 Before DOCTYPE name state
- [ ] 13.2.5.55 DOCTYPE name state
- [ ] 13.2.5.56 After DOCTYPE name state
- [ ] 13.2.5.57 After DOCTYPE public keyword state
- [ ] 13.2.5.58 Before DOCTYPE public identifier state
- [ ] 13.2.5.59 DOCTYPE public identifier (double-quoted) state
- [ ] 13.2.5.60 DOCTYPE public identifier (single-quoted) state
- [ ] 13.2.5.61 After DOCTYPE public identifier state
- [ ] 13.2.5.62 Between DOCTYPE public and system identifiers state
- [ ] 13.2.5.63 After DOCTYPE system keyword state
- [ ] 13.2.5.64 Before DOCTYPE system identifier state
- [ ] 13.2.5.65 DOCTYPE system identifier (double-quoted) state
- [ ] 13.2.5.66 DOCTYPE system identifier (single-quoted) state
- [ ] 13.2.5.67 After DOCTYPE system identifier state
- [x] 13.2.5.68 Bogus DOCTYPE state
- [ ] 13.2.5.69 CDATA section state
- [ ] 13.2.5.70 CDATA section bracket state
- [ ] 13.2.5.71 CDATA section end state
- [x] 13.2.5.72 Character reference state
- [ ] 13.2.5.73 Named character reference state
- [x] 13.2.5.74 Ambiguous ampersand state
- [x] 13.2.5.75 Numeric character reference state
- [x] 13.2.5.76 Hexadecimal character reference start state
- [x] 13.2.5.77 Decimal character reference start state
- [x] 13.2.5.78 Hexadecimal character reference state
- [x] 13.2.5.79 Decimal character reference state
- [x] 13.2.5.80 Numeric character reference end state

Spec compliance is **not intended to be complete**:

- The tokenizer is ignorant of [document namespaces](https://infra.spec.whatwg.org/#html-namespace) and will treat CDATA sections as bogus comments.
- Doctype details are not parsed but only preserved in their raw version.
- Named character references are left in their original form.

## Tests

mashtml uses the https://github.com/html5lib/html5lib-tests test-suite.

```shell
npm test
npm test:coverage
```

In alignment w/ the compliance requirements, tests involving any of the omitted parser states are skipped. Test criteria for doctypes have been softened. See `./test/html5lib.test.ts` for details.
