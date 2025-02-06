import type { ReactElement } from 'react';
import React from 'react';
import { ResourceContentLibraryImpl } from '@studio/content-library';
import { useSelectedContext } from '../../hooks/useSelectedContext';
import { StudioAlert, StudioCenter, StudioParagraph } from '@studio/components';
import { SelectedContextType } from '../../context/HeaderContext';
import classes from './OrgContentLibrary.module.css';
import { useTranslation } from 'react-i18next';

export function OrgContentLibrary(): ReactElement {
  const selectedContext = useSelectedContext();
  const contextWithNoLibraryAccess: string[] = [
    SelectedContextType.Self,
    SelectedContextType.All,
    SelectedContextType.None,
  ];

  return contextWithNoLibraryAccess.includes(selectedContext) ? (
    <ContextWithoutLibraryAccess />
  ) : (
    <OrgContentLibraryWithContext />
  );
}

function ContextWithoutLibraryAccess(): ReactElement {
  const { t } = useTranslation();
  return (
    <StudioCenter className={classes.noLibraryAccess}>
      <StudioAlert className={classes.alert}>
        <StudioParagraph>{t('dashboard.org_library.alert_no_org_selected')}</StudioParagraph>
        <StudioParagraph>
          {t('dashboard.org_library.alert_no_org_selected_no_access')}
        </StudioParagraph>
      </StudioAlert>
    </StudioCenter>
  );
}

function OrgContentLibraryWithContext(): ReactElement {
  const { getContentResourceLibrary } = new ResourceContentLibraryImpl({
    pages: {
      codeList: {
        props: {
          codeListsData: [],
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
