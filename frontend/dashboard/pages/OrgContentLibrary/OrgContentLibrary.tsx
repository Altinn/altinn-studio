import type { ReactElement } from 'react';
import React from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import type { CodeListWithMetadata } from '@studio/content-library';
import { useUpdateOrgCodeListMutation } from 'app-shared/hooks/mutations/useUpdateOrgCodeListMutation';
import { useSelectedContext } from '../../hooks/useSelectedContext';
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
  const { mutate: updateOptionList } = useUpdateOrgCodeListMutation(selectedContext);

  const handleUpdate = ({ title, codeList }: CodeListWithMetadata): void => {
    updateOptionList({ title, data: codeList });
  };

  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: [],
          onDeleteCodeList: () => {},
          onUpdateCodeListId: () => {},
          onUpdateCodeList: handleUpdate,
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
