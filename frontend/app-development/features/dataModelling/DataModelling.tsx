import React, { ReactNode, useState } from 'react';
import { Panel } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { SchemaEditorApp } from '@altinn/schema-editor/index';
import { Dialog } from '@mui/material';
import { getLocalStorageItem, setLocalStorageItem } from '@altinn/schema-editor/utils/localStorage';
import classes from './DataModelling.module.css';
import { useTranslation } from 'react-i18next';
import { useDatamodelsMetadataQuery } from '@altinn/schema-editor/hooks/queries';
import { QueryStatus } from '@tanstack/react-query';
import { MetadataOptionsGroup } from '@altinn/schema-editor/types/MetadataOptionsGroup';
import { MetadataOption } from '@altinn/schema-editor/types/MetadataOption';

interface IDataModellingContainerProps extends React.PropsWithChildren<any> {
  org: string;
  repo: string;
  createPathOption?: boolean;
}

type ShouldSelectFirstEntryProps = {
  metadataOptions?: MetadataOptionsGroup[];
  selectedOption?: MetadataOption;
  metadataStatus: QueryStatus;
};

export const shouldSelectFirstEntry = ({
  metadataOptions,
  selectedOption,
  metadataStatus,
}: ShouldSelectFirstEntryProps) =>
  metadataOptions?.length > 0 &&
  selectedOption === undefined &&
  metadataStatus === 'success';

export function DataModelling({
  createPathOption = false,
}: IDataModellingContainerProps): ReactNode {
  const { t } = useTranslation();
  const { data: metadataItems } = useDatamodelsMetadataQuery();

  const [hideIntroPage, setHideIntroPage] = useState(
    () => getLocalStorageItem('hideIntroPage')
  );
  const handleHideIntroPageButtonClick = () =>
    setHideIntroPage(setLocalStorageItem('hideIntroPage', true));

  return (
    <>
      <Dialog open={!hideIntroPage}>
        <Panel forceMobileLayout={true} title={t('schema_editor.info_dialog_title')}>
          <div>
            <p>{t('schema_editor.info_dialog_1')}</p>
            <p>{t('schema_editor.info_dialog_2')}</p>
            <p>
              {t('schema_editor.info_dialog_3')}{' '}
              <a href='https://docs.altinn.studio/app/development/data/data-model/'>
                {t('schema_editor.info_dialog_docs_link')}
              </a>
            </p>
          </div>
          <span className={classes.button}>
            <Button
              color={ButtonColor.Primary}
              onClick={() => setHideIntroPage(true)}
              variant={ButtonVariant.Outline}
            >
              Lukk
            </Button>
          </span>
          <span className={classes.button}>
            <Button
              color={ButtonColor.Secondary}
              onClick={handleHideIntroPageButtonClick}
              variant={ButtonVariant.Outline}
            >
              Ikke vis igjen
            </Button>
          </span>
        </Panel>
      </Dialog>
      <SchemaEditorApp
        createPathOption={createPathOption}
        displayLandingPage={hideIntroPage && !metadataItems?.length}
      />
    </>
  );
}
