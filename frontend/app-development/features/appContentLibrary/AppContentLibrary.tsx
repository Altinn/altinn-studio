import type {
  CodeListData,
  CodeListReference,
  CodeListWithMetadata,
} from '@studio/content-library';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type { ReactElement } from 'react';
import React, { useCallback } from 'react';

import { useOptionListsQuery, useOptionListsReferencesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { mapToCodeListDataList } from './utils/mapToCodeListDataList';
import { StudioPageError, StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import {
  useAddOptionListMutation,
  useUpdateOptionListMutation,
  useUpdateOptionListIdMutation,
  useDeleteOptionListMutation,
} from 'app-shared/hooks/mutations';
import { mapToCodeListUsages } from './utils/mapToCodeListUsages';
import type { OptionListData } from 'app-shared/types/OptionList';
import type { OptionListReferences } from 'app-shared/types/OptionListReferences';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: optionListDataList, status: optionListDataListStatus } = useOptionListsQuery(
    org,
    app,
  );
  const { data: optionListUsages, status: optionListUsagesStatus } = useOptionListsReferencesQuery(
    org,
    app,
  );

  const status = mergeQueryStatuses(optionListDataListStatus, optionListUsagesStatus);

  switch (status) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return <StudioPageError message={t('app_content_library.fetch_error')} />;
    case 'success':
      return (
        <AppContentLibraryWithData
          optionListDataList={optionListDataList}
          optionListUsages={optionListUsages}
        />
      );
  }
}

type AppContentLibraryWithDataProps = {
  optionListDataList: OptionListData[];
  optionListUsages: OptionListReferences;
};

function AppContentLibraryWithData({
  optionListDataList,
  optionListUsages,
}: AppContentLibraryWithDataProps): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const { mutate: updateOptionListId } = useUpdateOptionListIdMutation(org, app);
  const { mutate: deleteOptionList } = useDeleteOptionListMutation(org, app);
  const handleUpload = useUploadOptionList(org, app);

  const codeListDataList: CodeListData[] = mapToCodeListDataList(optionListDataList);

  const codeListsUsages: CodeListReference[] = mapToCodeListUsages(optionListUsages);

  const handleUpdateCodeListId = (optionListId: string, newOptionListId: string): void => {
    updateOptionListId({ optionListId, newOptionListId });
  };

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata) => {
    updateOptionList({ optionListId: title, optionList: codeList });
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: codeListDataList,
          onDeleteCodeList: deleteOptionList,
          onUpdateCodeListId: handleUpdateCodeListId,
          onUpdateCodeList: handleUpdate,
          onUploadCodeList: handleUpload,
          codeListsUsages,
        },
      },
      images: {
        props: {
          images: [],
          onUpdateImage: () => {},
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
}

function useUploadOptionList(org: string, app: string): (file: File) => void {
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => isErrorUnknown(error),
  });
  const { t } = useTranslation();

  return useCallback(
    (file: File) =>
      uploadOptionList(file, {
        onSuccess: () => {
          toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
        },
        onError: (error: AxiosError<ApiError>) => {
          if (isErrorUnknown(error)) {
            toast.error(t('ux_editor.modal_properties_code_list_upload_generic_error'));
          }
        },
      }),
    [uploadOptionList, t],
  );
}
