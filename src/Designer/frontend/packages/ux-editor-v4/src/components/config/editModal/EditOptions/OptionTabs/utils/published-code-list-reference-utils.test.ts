import {
  createPublishedCodeListReferenceString,
  extractValuesFromPublishedCodeListReferenceString,
  isPublishedCodeListReferenceString,
} from './published-code-list-reference-utils';
import type { PublishedCodeListReferenceValues } from '../types/PublishedCodeListReferenceValues';

describe('Published code list reference utils', () => {
  describe('isPublishedCodeListReferenceString', () => {
    it.each`
      description                                                                               | id                                 | orgName  | expected
      ${'is not a published code list ID'}                                                      | ${'something'}                     | ${'org'} | ${false}
      ${'is a published code list ID with fixed, single-digit version'}                         | ${'lib**org**name**3'}             | ${'org'} | ${true}
      ${'is a published code list ID with fixed, multiple-digit version'}                       | ${'lib**org**name**123'}           | ${'org'} | ${true}
      ${'is a published code list ID with latest version'}                                      | ${'lib**org**name**_latest'}       | ${'org'} | ${true}
      ${'follows the syntax for published code lists IDs, but version is invalid'}              | ${'lib**org**name**not-a-version'} | ${'org'} | ${false}
      ${'follows the syntax for published code lists IDs, but refers to another organisation'}  | ${'lib**org**name**3'}             | ${'abc'} | ${false}
      ${'has a syntax error'}                                                                   | ${'lib**org**name*3'}              | ${'org'} | ${false}
      ${'contains a published code list ID, but there is an additional character at the start'} | ${'xlib**org**name**3'}            | ${'org'} | ${false}
      ${'contains a published code list ID, but there is an additional character at the end'}   | ${'lib**org**name**3x'}            | ${'org'} | ${false}
      ${'has empty version'}                                                                    | ${'lib**org**name**'}              | ${'org'} | ${false}
      ${'has empty name'}                                                                       | ${'lib**org****3'}                 | ${'org'} | ${false}
      ${'has empty organisation'}                                                               | ${'lib****name**3'}                | ${'org'} | ${false}
    `('Returns $expected when the ID $description', ({ expected, id, orgName }) => {
      expect(isPublishedCodeListReferenceString(id, orgName)).toBe(expected);
    });
  });

  describe('extractValuesFromPublishedCodeListReferenceString', () => {
    it.each`
      id                             | expected
      ${'lib**org**name**3'}         | ${{ orgName: 'org', codeListName: 'name', version: '3' }}
      ${'lib**org**name**321'}       | ${{ orgName: 'org', codeListName: 'name', version: '321' }}
      ${'lib**org**name**_latest'}   | ${{ orgName: 'org', codeListName: 'name', version: '_latest' }}
      ${'lib**org**name**invalid'}   | ${null}
      ${'lib**org**name*3'}          | ${null}
      ${'not-a-published-code-list'} | ${null}
      ${'xlib**org**name**3'}        | ${null}
      ${'lib**org**name**3x'}        | ${null}
      ${'lib**org**name**'}          | ${null}
      ${'lib**org****3'}             | ${null}
      ${'lib****name**3'}            | ${null}
    `(
      'Returns $expected when the ID is $id',
      ({ expected, id }: { expected: PublishedCodeListReferenceValues | null; id: string }) => {
        expect(extractValuesFromPublishedCodeListReferenceString(id)).toEqual(expected);
      },
    );
  });

  describe('createPublishedCodeListReferenceString', () => {
    it.each`
      orgName  | codeListName      | version      | expected
      ${'org'} | ${'name'}         | ${'3'}       | ${'lib**org**name**3'}
      ${'org'} | ${'name'}         | ${'321'}     | ${'lib**org**name**321'}
      ${'org'} | ${'name'}         | ${'_latest'} | ${'lib**org**name**_latest'}
      ${'abc'} | ${'name'}         | ${'321'}     | ${'lib**abc**name**321'}
      ${'org'} | ${'another-name'} | ${'321'}     | ${'lib**org**another-name**321'}
    `(
      'Returns $expected when orgName is $orgName, codeListName is $codeListName and version is $version',
      ({
        expected,
        orgName,
        codeListName,
        version,
      }: PublishedCodeListReferenceValues & { expected: string }) => {
        const input: PublishedCodeListReferenceValues = { orgName, codeListName, version };
        expect(createPublishedCodeListReferenceString(input)).toBe(expected);
      },
    );
  });

  describe('Given valid data, extractValuesFromPublishedCodeListReferenceString is inverse of createPublishedCodeListReferenceString', () => {
    test.each([
      ['org', 'name', '3'],
      ['org', 'name', '321'],
      ['org', 'name', '_latest'],
      ['abc', 'name', '321'],
      ['org', 'another-name', '321'],
    ])(
      'When orgName is %s, codeListName is %s and version is %s',
      (orgName: string, codeListName: string, version: string) => {
        const input = { orgName, codeListName, version };
        const generatedString = createPublishedCodeListReferenceString(input);
        const extractedValues = extractValuesFromPublishedCodeListReferenceString(generatedString);
        expect(extractedValues).toEqual(input);
      },
    );
  });
});
