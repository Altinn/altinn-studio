import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';

export type ImportCodeListResponse = {
  optionList: OptionListsResponse;
  textResources: Record<string, ITextResourcesWithLanguage>;
};
