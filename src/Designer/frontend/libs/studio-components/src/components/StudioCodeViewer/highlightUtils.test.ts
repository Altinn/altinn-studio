import { getCodeLanguageFromFileName, splitHighlightedCodeIntoLines } from './highlightUtils';

describe('getCodeLanguageFromFileName', () => {
  it.each([
    ['App/config/applicationmetadata.json', 'json'],
    ['App/App.csproj', 'xml'],
    ['App/models/model.xsd', 'xml'],
    ['App/config/process/process.bpmn', 'xml'],
    ['App/logic/Program.cs', 'csharp'],
    ['deployment/values.yaml', 'yaml'],
    ['App/ui/form/layouts/Side1.JSON', 'json'],
    ['Dockerfile', 'dockerfile'],
    ['.editorconfig', 'ini'],
  ])('returns the language of %s', (fileName, expectedLanguage) => {
    expect(getCodeLanguageFromFileName(fileName)).toBe(expectedLanguage);
  });

  it.each(['App.sln', '.gitignore', 'LICENSE'])(
    'returns undefined when the language of %s is unknown',
    (fileName) => {
      expect(getCodeLanguageFromFileName(fileName)).toBeUndefined();
    },
  );
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
