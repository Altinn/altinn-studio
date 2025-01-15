import type { CodeListReference, CodeListWithMetadata } from '@studio/content-library';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type { ReactElement } from 'react';
import React from 'react';
import { useOptionListsQuery, useOptionListsReferencesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { convertOptionsListsDataToCodeListsData } from './utils/convertOptionsListsDataToCodeListsData';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import {
  useAddOptionListMutation,
  useUpdateOptionListMutation,
  useUpdateOptionListIdMutation,
} from 'app-shared/hooks/mutations';
import { mapToCodeListsUsage } from './utils/mapToCodeListsUsage';
import type { OptionListData } from 'app-shared/types/OptionList';
import type { OptionListReferences } from 'app-shared/types/OptionListReferences';

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: optionListDataList, isPending: optionListsDataPending } = useOptionListsQuery(
    org,
    app,
  );
  const { data: optionListUsages, isPending: optionListsUsageIsPending } =
    useOptionListsReferencesQuery(org, app);

  if (optionListsDataPending || optionListsUsageIsPending) {
    return <StudioPageSpinner spinnerTitle={t('general.loading')}></StudioPageSpinner>;
  } else {
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
  const { t } = useTranslation();
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => isErrorUnknown(error),
  });
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const { mutate: updateOptionListId } = useUpdateOptionListIdMutation(org, app);

  const codeListsData = convertOptionsListsDataToCodeListsData(optionListDataList);

  const codeListsUsages: CodeListReference[] = mapToCodeListsUsage(optionListUsages);

  const handleUpdateCodeListId = (optionListId: string, newOptionListId: string) => {
    updateOptionListId({ optionListId, newOptionListId });
  };

  const handleUpload = (file: File) => {
    uploadOptionList(file, {
      onSuccess: () => {
        toast.success(t('ux_editor.modal_properties_code_list_upload_success'));
      },
      onError: (error: AxiosError<ApiError>) => {
        if (isErrorUnknown(error)) {
          toast.error(t('ux_editor.modal_properties_code_list_upload_generic_error'));
        }
      },
    });
  };

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata) => {
    updateOptionList({ optionListId: title, optionsList: codeList });
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData,
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
