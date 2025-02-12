import type { ReactElement } from 'react';
import React from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type { CodeListData } from '@studio/content-library';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import {
  StudioAlert,
  StudioCenter,
  StudioParagraph,
  StudioPageError,
  StudioPageSpinner,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
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

  const { data: codeListsResponseList, status: codeListDataListStatus } =
    useOrgCodeListsQuery(selectedContext);

  switch (codeListDataListStatus) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return <StudioPageError message={t('dashboard.org_library.fetch_error')} />;
    case 'success':
      return <OrgContentLibraryWithContextAndData codeListsData={codeListsResponseList} />;
  }
}

type OrgContentLibraryWithContextAndDataProps = {
  codeListsData: CodeListData[];
};

function OrgContentLibraryWithContextAndData({
  codeListsData,
}: OrgContentLibraryWithContextAndDataProps): ReactElement {
  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData,
          onDeleteCodeList: () => {},
          onUpdateCodeListId: () => {},
          onUpdateCodeList: () => {},
          onUploadCodeList: () => {},
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
