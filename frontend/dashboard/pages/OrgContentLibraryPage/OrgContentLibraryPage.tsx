import type { ReactElement } from 'react';
import React, { useMemo, useCallback } from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type {
  CodeListData,
  CodeListWithMetadata,
  TextResourceWithLanguage,
} from '@studio/content-library';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import {
  StudioAlert,
  StudioCenter,
  StudioParagraph,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components-legacy';
import { useUpdateOrgCodeListMutation } from 'app-shared/hooks/mutations/useUpdateOrgCodeListMutation';
import { useTranslation } from 'react-i18next';
import { isErrorUnknown } from 'app-shared/utils/ApiErrorUtils';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { useCreateOrgCodeListMutation } from 'app-shared/hooks/mutations/useCreateOrgCodeListMutation';
import { useUploadOrgCodeListMutation } from 'app-shared/hooks/mutations/useUploadOrgCodeListMutation';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { useDeleteOrgCodeListMutation } from 'app-shared/hooks/mutations/useDeleteOrgCodeListMutation';
import {
  textResourcesWithLanguageToLibraryTextResources,
  textResourceWithLanguageToMutationArgs,
} from './utils';
import { isOrg } from '../../utils/orgUtils';
import { useOrgCodeListsQuery } from 'app-shared/hooks/queries/useOrgCodeListsQuery';
import { useListenToMergeConflictInRepo } from 'app-shared/hooks/useListenToMergeConflictInRepo';
import { useOrgRepoName } from 'dashboard/hooks/useOrgRepoName';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { MergeConflictWarning } from 'app-shared/components/MergeConflictWarning';
import { useOrgTextResourcesQuery } from 'app-shared/hooks/queries/useOrgTextResourcesQuery';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { mergeQueryStatuses } from 'app-shared/utils/tanstackQueryUtils';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import { useUpdateOrgTextResourcesMutation } from 'app-shared/hooks/mutations/useUpdateOrgTextResourcesMutation';

export function OrgContentLibraryPage(): ReactElement {
  const selectedContext = useSelectedContext();

  return isOrg(selectedContext) ? (
    <OrgContentLibrary orgName={selectedContext} />
  ) : (
    <ContextWithoutLibraryAccess />
  );
}

type OrgContentLibraryProps = {
  orgName: string;
};

function OrgContentLibrary({ orgName }: OrgContentLibraryProps): ReactElement {
  const orgRepoName = useOrgRepoName();
  const { data: repoStatus } = useRepoStatusQuery(orgName, orgRepoName);
  useListenToMergeConflictInRepo(orgName, orgRepoName);

  if (repoStatus?.hasMergeConflict) {
    return <MergeConflictWarning owner={orgName} repoName={orgRepoName} />;
  } else {
    return <MergeableOrgContentLibrary orgName={orgName} />;
  }
}

type MergeableOrgContentLibraryProps = {
  orgName: string;
};

function MergeableOrgContentLibrary({ orgName }: MergeableOrgContentLibraryProps): ReactElement {
  const { t } = useTranslation();
  const { data: codeListDataList, status: codeListDataListStatus } = useOrgCodeListsQuery(orgName);
  const { data: textResources, status: textResourcesStatus } = useOrgTextResourcesQuery(
    orgName,
    DEFAULT_LANGUAGE,
  );

  const status = mergeQueryStatuses(codeListDataListStatus, textResourcesStatus);

  switch (status) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return <StudioPageError message={t('dashboard.org_library.fetch_error')} />;
    case 'success':
      return (
        <OrgContentLibraryWithContextAndData
          codeListDataList={codeListDataList}
          orgName={orgName}
          textResources={textResources}
        />
      );
  }
}

type OrgContentLibraryWithContextAndDataProps = {
  codeListDataList: CodeListData[];
  orgName: string;
  textResources: ITextResourcesWithLanguage;
};

function OrgContentLibraryWithContextAndData({
  codeListDataList,
  orgName,
  textResources: textResourcesWithLanguage,
}: OrgContentLibraryWithContextAndDataProps): ReactElement {
  const { mutate: updateCodeList } = useUpdateOrgCodeListMutation(orgName);
  const { mutate: deleteCodeList } = useDeleteOrgCodeListMutation(orgName);
  const { mutate: createCodeList } = useCreateOrgCodeListMutation(orgName);
  const { mutate: updateTextResources } = useUpdateOrgTextResourcesMutation(orgName);

  const handleUpload = useUploadCodeList(orgName);

  const textResources = useMemo(
    () => textResourcesWithLanguageToLibraryTextResources(textResourcesWithLanguage),
    [textResourcesWithLanguage],
  );

  const handleUpdateTextResource = useCallback(
    (textResourceWithLanguage: TextResourceWithLanguage) => {
      updateTextResources(textResourceWithLanguageToMutationArgs(textResourceWithLanguage));
    },
    [updateTextResources],
  );

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata): void => {
    updateCodeList({ title, data: codeList });
  };

  const handleCreate = ({ title, codeList }: CodeListWithMetadata): void => {
    createCodeList({ title, data: codeList });
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: codeListDataList,
          onCreateCodeList: handleCreate,
          onCreateTextResource: handleUpdateTextResource,
          onDeleteCodeList: deleteCodeList,
          onUpdateCodeListId: () => {},
          onUpdateCodeList: handleUpdate,
          onUpdateTextResource: handleUpdateTextResource,
          onUploadCodeList: handleUpload,
          textResources,
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

function useUploadCodeList(orgName: string): (file: File) => void {
  const { mutate: uploadCodeList } = useUploadOrgCodeListMutation(orgName, {
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
