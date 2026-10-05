import { findJsonFoldRegions, formatJson, splitHighlightedCodeIntoLines } from './codeLines';

describe('formatJson', () => {
  it('indents compact JSON with two spaces for each level', () => {
    const code = '{"id":"app","dataTypes":[{"id":"model","maxCount":1}],"title":{"nb":"App"}}';
    expect(formatJson(code)).toBe(
      [
        '{',
        '  "id": "app",',
        '  "dataTypes": [',
        '    {',
        '      "id": "model",',
        '      "maxCount": 1',
        '    }',
        '  ],',
        '  "title": {',
        '    "nb": "App"',
        '  }',
        '}',
      ].join('\n'),
    );
  });

  it('keeps empty objects and arrays on one line', () => {
    expect(formatJson('{ "a": {}, "b": [ ] }')).toBe('{\n  "a": {},\n  "b": []\n}');
  });

  it('keeps numbers, literals and escaped characters as they are in the source', () => {
    expect(formatJson('[1.0,1e3,true,null,"a\\"{,}\\u00e6"]')).toBe(
      '[\n  1.0,\n  1e3,\n  true,\n  null,\n  "a\\"{,}\\u00e6"\n]',
    );
  });

  it('ignores a byte order mark', () => {
    expect(formatJson('﻿{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it('returns null when the code is not valid JSON', () => {
    expect(formatJson('{ "a": 1, }')).toBeNull();
  });
});

describe('findJsonFoldRegions', () => {
  it('maps the first line of each object and array to its last line', () => {
    const lines = formatJson('{"a":[1,{"b":2}],"c":{}}').split('\n');
    expect(findJsonFoldRegions(lines)).toEqual(
      new Map([
        [0, 8],
        [1, 6],
        [3, 5],
      ]),
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
