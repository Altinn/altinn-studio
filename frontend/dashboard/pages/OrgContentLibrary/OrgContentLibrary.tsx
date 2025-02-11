import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type { CodeListData, CodeListWithMetadata } from '@studio/content-library';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useOrgCodeListsQuery } from 'app-shared/hooks/queries/useOrgCodeListsQuery';
import { StudioPageError, StudioPageSpinner } from '@studio/components';
import { useDeleteOrgCodeListMutation } from 'app-shared/hooks/mutations/useDeleteOrgCodeListMutation';
import { useUpdateOrgCodeListMutation } from 'app-shared/hooks/mutations/useUpdateOrgCodeListMutation';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { useUploadOrgCodeListMutation } from 'app-shared/hooks/mutations/useUploadOrgCodeListMutation';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { useSelectedContext } from '../../hooks/useSelectedContext';

export function OrgContentLibrary(): ReactElement {
  const org = useSelectedContext();
  const { t } = useTranslation();

  const { data: codeListsResponseList, status: codeListDataListStatus } = useOrgCodeListsQuery(org);

  console.log('ORG', org);

  switch (codeListDataListStatus) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return <StudioPageError message={t('dashboard.org_library.fetch_error')} />;
    case 'success':
      return <OrgContentLibraryWithData codeListsData={codeListsResponseList} />;
  }
}

type OrgContentLibraryWithDataProps = {
  codeListsData: CodeListData[];
};
export function OrgContentLibraryWithData({
  codeListsData,
}: OrgContentLibraryWithDataProps): ReactElement {
  const { org } = useStudioEnvironmentParams();
  const { mutate: deleteCodeList } = useDeleteOrgCodeListMutation(org);
  const { mutate: updateOptionList } = useUpdateOrgCodeListMutation(org);

  const handleUpload = useUploadCodeList(org);

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata): void => {
    updateOptionList({ title, data: codeList });
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData,
          onDeleteCodeList: deleteCodeList,
          onUpdateCodeListId: () => {},
          onUpdateCodeList: handleUpdate,
          onUploadCodeList: handleUpload,
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
}

function useUploadCodeList(org: string): (file: File) => void {
  const { mutate: uploadCodeList } = useUploadOrgCodeListMutation(org, {
    hideDefaultError: (error: AxiosError<ApiError>) => isErrorUnknown(error),
  });
  const { t } = useTranslation();

  return useCallback(
    (file: File) =>
      uploadCodeList(file, {
        onSuccess: () => {
          toast.success(t('dashboard.org_library.code_list_upload_success'));
        },
        onError: (error: AxiosError<ApiError>) => {
          if (isErrorUnknown(error)) {
            toast.error(t('dashboard.org_library.code_list_upload_generic_error'));
          }
        },
      }),
    [uploadCodeList, t],
  );
}
