import type { ReactElement } from 'react';
import React from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type { CodeListData, CodeListWithMetadata } from '@studio/content-library';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { useOrgCodeListsQuery } from 'app-shared/hooks/queries/useOrgCodeListsQuery';
import { StudioPageError, StudioPageSpinner } from '@studio/components';
import { useDeleteOrgCodeListMutation } from 'app-shared/hooks/mutations/useDeleteOrgCodeListMutation';
import { useUpdateOrgCodeListMutation } from 'app-shared/hooks/mutations/useUpdateOrgCodeListMutation';

export function OrgContentLibrary(): ReactElement {
  const { org } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const { data: codeListsResponseList, status: codeListDataListStatus } = useOrgCodeListsQuery(org);

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
          onUploadCodeList: () => {},
        },
      },
    },
  });

  return <div>{getContentResourceLibrary()}</div>;
}
