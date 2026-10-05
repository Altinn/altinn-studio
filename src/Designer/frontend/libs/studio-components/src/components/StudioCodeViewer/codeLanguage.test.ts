import { getCodeLanguageFromFileName } from './codeLanguage';

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
