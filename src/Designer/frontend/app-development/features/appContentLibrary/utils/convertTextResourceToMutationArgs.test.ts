import type { TextResource, TextResourceWithLanguage } from '@studio/content-library';
import { convertTextResourceToMutationArgs } from './convertTextResourceToMutationArgs';

describe('convertTextResourceToMutationArgs', () => {
  it('Converts a TextResourceWithLanguage object to an UpsertTextResourceMutation object', () => {
    const language = 'nn';
    const id = 'a_text';
    const value = 'Ein tekst';
    const textResource: TextResource = { id, value };
    const textResourceWithLanguage: TextResourceWithLanguage = { language, textResource };
    const result = convertTextResourceToMutationArgs(textResourceWithLanguage);
    expect(result).toEqual({ textId: id, language, translation: value });
  });
});
