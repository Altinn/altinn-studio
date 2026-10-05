import { findJsonFoldRegions, splitHighlightedCodeIntoLines } from './codeLines';

describe('findJsonFoldRegions', () => {
  it('maps the first line of each object and array to its last line and closing bracket', () => {
    const code = ['{', '  "a": [', '    1', '  ],', '  "b": {', '    "c": 2', '  }', '}'].join(
      '\n',
    );
    expect(findJsonFoldRegions(code)).toEqual(
      new Map([
        [0, { endIndex: 7, closingColumn: 0 }],
        [1, { endIndex: 3, closingColumn: 2 }],
        [4, { endIndex: 6, closingColumn: 2 }],
      ]),
    );
  });

  it('finds the closing bracket after other content on the last line', () => {
    expect(findJsonFoldRegions('{\n  "a": 1,\n  "b": 2 },')).toEqual(
      new Map([[0, { endIndex: 2, closingColumn: 9 }]]),
    );
  });

  it('uses the innermost region when more regions start on the same line', () => {
    expect(findJsonFoldRegions('[{\n  "a": 1\n}\n]')).toEqual(
      new Map([[0, { endIndex: 2, closingColumn: 0 }]]),
    );
  });

  it('ignores regions that hide no lines', () => {
    expect(findJsonFoldRegions('{"a": [1], "b": {\n}}')).toEqual(new Map());
  });

  it('ignores brackets in strings', () => {
    expect(findJsonFoldRegions('{\n  "a": "{[\\"",\n  "b": "]}"\n}')).toEqual(
      new Map([[0, { endIndex: 3, closingColumn: 0 }]]),
    );
  });
});

describe('splitHighlightedCodeIntoLines', () => {
  it('splits the HTML at each line break', () => {
    const html = '<span class="a">1</span>\n<span class="b">2</span>';
    expect(splitHighlightedCodeIntoLines(html)).toEqual([
      '<span class="a">1</span>',
      '<span class="b">2</span>',
    ]);
  });

  it('closes and opens again an element that continues on the next line', () => {
    const html = '<span class="comment">/* one\ntwo */</span> code';
    expect(splitHighlightedCodeIntoLines(html)).toEqual([
      '<span class="comment">/* one</span>',
      '<span class="comment">two */</span> code',
    ]);
  });
});
