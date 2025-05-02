import { getCodeListIdsFromExternalResources } from './utils';
import type { ExternalResource } from 'app-shared/types/ExternalResource';
import { externalResources } from '../../../../../../test-data/externalResources';
import { LibraryContentType } from 'app-shared/enums/LibraryContentType';
import { StringUtils } from '@studio/pure-functions';

describe('getCodeListIdsFromExternalResources', () => {
  it('returns only code list resource ids', () => {
    const result = getCodeListIdsFromExternalResources(externalResources);
    const expected = externalResources
      .filter((r) => StringUtils.areCaseInsensitiveEqual(r.type, LibraryContentType.CodeList))
      .map((r) => r.id);
    expect(result).toEqual(expected);
  });

  it('returns empty array if no code list resources are present', () => {
    const onlyNonCodeList: ExternalResource[] = [
      { id: '1', type: LibraryContentType.TextResource, source: 'source1' },
    ];
    const result = getCodeListIdsFromExternalResources(onlyNonCodeList);
    expect(result).toEqual([]);
  });

  it('returns empty array if input is empty', () => {
    const result = getCodeListIdsFromExternalResources([]);
    expect(result).toEqual([]);
  });

  it('returns empty array if input is undefined', () => {
    const result = getCodeListIdsFromExternalResources(undefined as unknown as ExternalResource[]);
    expect(result).toEqual([]);
  });
});
