import type {
  TextResources as LibraryTextResources,
  TextResourceWithLanguage as LibraryTextResourceWithLanguage,
  PagesConfig,
} from '@studio/content-library';
import type { UpdateOrgTextResourcesMutationArgs } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { CodeListsNewResponse } from 'app-shared/types/api/CodeListsNewResponse';
import type { CodeListDataNew } from 'app-shared/types/CodeListDataNew';

export function textResourceWithLanguageToMutationArgs({
  language,
  textResource,
}: LibraryTextResourceWithLanguage): UpdateOrgTextResourcesMutationArgs {
  const payload: KeyValuePairs<string> = { [textResource.id]: textResource.value };
  return { language, payload };
}

export function textResourcesWithLanguageToLibraryTextResources({
  language,
  resources,
}: ITextResourcesWithLanguage): LibraryTextResources {
  return { [language]: resources };
}

export function backendCodeListsToLibraryCodeLists(
  codeLists: CodeListsNewResponse,
): PagesConfig['codeLists']['props']['codeLists'] {
  return codeLists.codeListWrappers.filter(isWithoutError).map(({ codeList, title }) => ({
    name: title,
    codes: codeList.codes,
  }));
}

function isWithoutError(codeListData: CodeListDataNew): codeListData is ValidCodeListData {
  return codeListData.codeList && !codeListData.hasError;
}

type ValidCodeListData = Required<Omit<CodeListDataNew, 'hasError'>>;
