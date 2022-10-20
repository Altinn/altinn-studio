import { prettyErrors } from 'src/features/expressions/prettyErrors';

describe('prettyErrors', () => {
  it('should pretty-print errors for simple values', () => {
    expect(
      prettyErrors({
        input: 'hello world',
        errors: { '': ['Some error message'] },
      }),
    ).toEqual(
      ['"hello world"', '~~~~~~~~~~~~~', '→ Some error message'].join('\n'),
    );
  });
  it('should pretty-print multiple errors', () => {
    expect(
      prettyErrors({
        input: 'hello world',
        errors: {
          '': ['Some error message', 'some other message'],
        },
      }),
    ).toEqual(
      [
        '"hello world"',
        '~~~~~~~~~~~~~',
        '→ Some error message',
        '→ some other message',
      ].join('\n'),
    );
  });
  it('should pretty-print errors inside a simple array', () => {
    expect(
      prettyErrors({
        input: ['hello', 'world'],
        errors: {
          '[0]': ['Hello is not valid', 'some other message'],
          '[1]': ['World is not valid'],
        },
      }),
    ).toEqual(
      [
        '[',
        '  "hello",',
        '  ~~~~~~~',
        '  → Hello is not valid',
        '  → some other message',
        '  "world"',
        '  ~~~~~~~',
        '  → World is not valid',
        ']',
      ].join('\n'),
    );
  });
  it('should pretty-print errors inside a complex object', () => {
    expect(
      prettyErrors({
        input: {
          key1: ['hello', 'world'],
          key2: ['hello', 'world'],
          key3: {
            arr1: ['hello', 'world'],
            arr2: ['hello', 'world'],
            string1: 'foo',
            number1: 5,
            null1: null,
            bool1: true,
          },
        },
        errors: {
          key1: ['this array is fine'],
          'key2[1]': ['world found here'],
          'key3.arr2[1]': ['world found here as well', 'some other line'],
          'key3.arr2': ['this whole array is wrong'],
          'key3.string1': ['foo found here'],
          key3: ['this whole object is wrong'],
        },
      }),
    ).toEqual(
      [
        '{',
        '  key1: ["hello", "world"],',
        '  ~~~~~~~~~~~~~~~~~~~~~~~~',
        '  → this array is fine',
        '  key2: [',
        '    "hello",',
        '    "world"',
        '    ~~~~~~~',
        '    → world found here',
        '  ],',
        '  key3: {',
        '    arr1: ["hello", "world"],',
        '    arr2: [',
        '      "hello",',
        '      "world"',
        '      ~~~~~~~',
        '      → world found here as well',
        '      → some other line',
        '    ],',
        '    ~',
        '    → this whole array is wrong',
        '    string1: "foo",',
        '    ~~~~~~~~~~~~~~',
        '    → foo found here',
        '    number1: 5,',
        '    null1: null,',
        '    bool1: true',
        '  }',
        '  ~',
        '  → this whole object is wrong',
        '}',
      ].join('\n'),
    );
  });
  it('should pretty-print a complex object without errors', () => {
    expect(
      prettyErrors({
        input: {
          arr1: ['hello', 'world'],
          arr2: ['hello', 'world'],
          obj3: { key: 'value' },
          obj4: {
            arr1: ['hello', 'world'],
            arr2: ['hello', 'world'],
            arr3: ['hello', 'world', 'and', 'many', 'other', 'items'],
            string1: 'foo',
            number1: 5,
            null1: null,
            bool1: true,
          },
        },
      }),
    ).toEqual(
      [
        '{',
        '  arr1: ["hello", "world"],',
        '  arr2: ["hello", "world"],',
        '  obj3: {key: "value"},',
        '  obj4: {',
        '    arr1: ["hello", "world"],',
        '    arr2: ["hello", "world"],',
        '    arr3: [',
        '      "hello",',
        '      "world",',
        '      "and",',
        '      "many",',
        '      "other",',
        '      "items"',
        '    ],',
        '    string1: "foo",',
        '    number1: 5,',
        '    null1: null,',
        '    bool1: true',
        '  }',
        '}',
      ].join('\n'),
    );
  });
  it('should render an expression error message', () => {
    expect(
      prettyErrors({
        input: {
          function: 'greaterThanEq',
          args: [{ function: 'component', args: ['alder'] }, 18],
        },
        errors: { 'args[0]': ['some error message about this expression'] },
      }),
    ).toEqual(
      [
        '{',
        '  function: "greaterThanEq",',
        '  args: [',
        '    {function: "component", args: ["alder"]},',
        '    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        '    → some error message about this expression',
        '    18',
        '  ]',
        '}',
      ].join('\n'),
    );
  });
  it('should render another expression error message', () => {
    expect(
      prettyErrors({
        input: {
          function: 'greaterThanEq',
          args: [{ function: 'component', args: ['alder'] }, 18],
        },
        errors: { 'args[1]': ['some error message about 18'] },
      }),
    ).toEqual(
      [
        '{',
        '  function: "greaterThanEq",',
        '  args: [',
        '    {function: "component", args: ["alder"]},',
        '    18',
        '    ~~',
        '    → some error message about 18',
        '  ]',
        '}',
      ].join('\n'),
    );
  });
});
