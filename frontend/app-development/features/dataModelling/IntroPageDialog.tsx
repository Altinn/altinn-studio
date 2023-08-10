import { Dialog } from '@mui/material';
import { Panel } from '@altinn/altinn-design-system';
import classes from './IntroPageDialog.module.css';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import React from 'react';
import { useTranslation } from 'react-i18next'
import { setLocalStorageItem } from '@altinn/schema-editor/utils/localStorage';

export interface IntroPageDialogProps {
  isHidden: boolean;
  setIsHidden: (isHidden: boolean) => void;
}

export const IntroPageDialog = ({ isHidden, setIsHidden }: IntroPageDialogProps) => {
  const { t } = useTranslation();
  const hideIntroPageForever = () => setIsHidden(setLocalStorageItem('hideIntroPage', true));
  return (
    <Dialog open={!isHidden}>
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
              onClick={() => setIsHidden(true)}
              variant={ButtonVariant.Outline}
            >
              Lukk
            </Button>
          </span>
          <span className={classes.button}>
            <Button
              color={ButtonColor.Secondary}
              onClick={hideIntroPageForever}
              variant={ButtonVariant.Outline}
            >
              Ikke vis igjen
            </Button>
          </span>
      </Panel>
    </Dialog>
  )
};
