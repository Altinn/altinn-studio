import type { ReactElement } from 'react';
import React, { useCallback } from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import { useTranslation } from 'react-i18next';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { useUploadOrgCodeListMutation } from 'app-shared/hooks/mutations/useUploadOrgCodeListMutation';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { StudioAlert, StudioCenter, StudioParagraph } from '@studio/components';
import { isOrg } from './utils';

export function OrgContentLibrary(): ReactElement {
  const selectedContext = useSelectedContext();
  return isOrg(selectedContext) ? (
    <OrgContentLibraryWithContext />
  ) : (
    <ContextWithoutLibraryAccess />
  );
}

function OrgContentLibraryWithContext(): ReactElement {
  const selectedContext = useSelectedContext();
  const handleUpload = useUploadCodeList(selectedContext);

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: [],
          onDeleteCodeList: () => {},
          onUpdateCodeListId: () => {},
          onUpdateCodeList: () => {},
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
