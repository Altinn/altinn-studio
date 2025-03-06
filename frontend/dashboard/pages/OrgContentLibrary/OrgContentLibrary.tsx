import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type { CodeListData, CodeListWithMetadata } from '@studio/content-library';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import {
  StudioAlert,
  StudioCenter,
  StudioParagraph,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { useUpdateOrgCodeListMutation } from 'app-shared/hooks/mutations/useUpdateOrgCodeListMutation';
import { useTranslation } from 'react-i18next';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { useUploadOrgCodeListMutation } from 'app-shared/hooks/mutations/useUploadOrgCodeListMutation';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { useDeleteOrgCodeListMutation } from 'app-shared/hooks/mutations/useDeleteOrgCodeListMutation';
import { isOrg } from './utils';
import { useOrgCodeListsQuery } from 'app-shared/hooks/queries/useOrgCodeListsQuery';

export function OrgContentLibrary(): ReactElement {
  const selectedContext = useSelectedContext();

  return isOrg(selectedContext) ? (
    <OrgContentLibraryWithContext />
  ) : (
    <ContextWithoutLibraryAccess />
  );
}

function OrgContentLibraryWithContext(): ReactElement {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();

  const { data: codeListsResponse, status: codeListResponseStatus } =
    useOrgCodeListsQuery(selectedContext);

  switch (codeListResponseStatus) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return <StudioPageError message={t('dashboard.org_library.fetch_error')} />;
    case 'success':
      return <OrgContentLibraryWithContextAndData codeListsDataList={codeListsResponse} />;
  }
}

type OrgContentLibraryWithContextAndDataProps = {
  codeListsDataList: CodeListData[];
};

function OrgContentLibraryWithContextAndData({
  codeListsDataList,
}: OrgContentLibraryWithContextAndDataProps): ReactElement {
  const selectedContext = useSelectedContext();

  const { mutate: updateOptionList } = useUpdateOrgCodeListMutation(selectedContext);
  const { mutate: deleteCodeList } = useDeleteOrgCodeListMutation(selectedContext);

  const handleUpload = useUploadCodeList(selectedContext);

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata): void => {
    updateOptionList({ title, data: codeList });
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: codeListsDataList,
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

function ContextWithoutLibraryAccess(): ReactElement {
  const { t } = useTranslation();
  return (
    <StudioCenter>
      <StudioAlert>
        <StudioParagraph>{t('dashboard.org_library.alert_no_org_selected')}</StudioParagraph>
        <StudioParagraph>
          {t('dashboard.org_library.alert_no_org_selected_no_access')}
        </StudioParagraph>
      </StudioAlert>
    </StudioCenter>
  );
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
