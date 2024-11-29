import type { CodeListWithMetadata, OnGetCodeListResult } from '@studio/content-library';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { convertOptionsListToCodeListResult } from './utils/convertOptionsListToCodeListResult';
import { StudioPageSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useAddOptionListMutation, useUpdateOptionListMutation } from 'app-shared/hooks/mutations';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import { useGetOptionListQuery } from 'app-shared/hooks/queries';

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const {
    data: optionLists,
    isPending: optionListsPending,
    isError: optionListsError,
  } = useOptionListsQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => isErrorUnknown(error),
  });
  const { data: optionListIds, isPending: optionListIdsPending } = useOptionListIdsQuery(org, app);
  const getOptionList = useGetOptionListQuery(org, app);
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app);
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);

  if (optionListIdsPending)
    return <StudioPageSpinner spinnerTitle={t('general.loading')}></StudioPageSpinner>;

  const handleGetOptionList = (optionListId: string): OnGetCodeListResult => {
    const { data: optionList, isError: optionListError } = getOptionList(optionListId);
    return convertOptionsListToCodeListResult(optionListId, optionList, optionListError);
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
          codeListIds: optionListIds,
          onGetCodeList: handleGetOptionList,
          onUpdateCodeList: handleUpdate,
          onUploadCodeList: handleUpload,
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
