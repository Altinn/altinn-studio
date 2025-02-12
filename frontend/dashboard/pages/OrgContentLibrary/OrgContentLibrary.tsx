import type { ReactElement } from 'react';
import React from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { useDeleteOrgCodeListMutation } from 'app-shared/hooks/mutations/useDeleteOrgCodeListMutation';
import { StudioAlert, StudioCenter, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
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
  const { mutate: deleteCodeList } = useDeleteOrgCodeListMutation(selectedContext);

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: [],
          onDeleteCodeList: deleteCodeList,
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
