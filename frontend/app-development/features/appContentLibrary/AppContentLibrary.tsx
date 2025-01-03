import type { CodeListWithMetadata } from '@studio/content-library';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import React from 'react';
import { useOptionListsQuery } from 'app-shared/hooks/queries';
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

export function AppContentLibrary(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: optionListsData, isPending: optionListsDataPending } = useOptionListsQuery(
    org,
    app,
  );
  const { mutate: uploadOptionList } = useAddOptionListMutation(org, app, {
    hideDefaultError: (error: AxiosError<ApiError>) => isErrorUnknown(error),
  });
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const { mutate: updateOptionListId } = useUpdateOptionListIdMutation(org, app);

  if (optionListsDataPending)
    return <StudioPageSpinner spinnerTitle={t('general.loading')}></StudioPageSpinner>;

  const codeListsData = convertOptionsListsDataToCodeListsData(optionListsData);

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
