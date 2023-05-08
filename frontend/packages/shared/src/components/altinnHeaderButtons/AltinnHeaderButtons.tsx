import React from 'react';
import classes from './AltinnHeaderbuttons.module.css';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { previewPath, publiserPath } from 'app-shared/api-paths';
import { useParams } from 'react-router-dom';
import { TopBarMenu } from 'app-development/layout/AppBar/appBarConfig';

export const AltinnHeaderButtons = () => {
  const { t } = useTranslation();
  const { org, app } = useParams();

  const handlePubliserClick = () => {
    window.location.href = publiserPath(org, app);
  };

  const handlePreviewClick = () => {
    window.location.href = previewPath(org, app);
  };

  return (
    <div className={classes.rightContent}>
      <div className={classes.rightContentButtons}>
        <Button
          className={classes.previewButton}
          onClick={handlePreviewClick}
          variant={ButtonVariant.Outline}
          data-testid={TopBarMenu.Preview}
        >
          {t('top_menu.preview')}
        </Button>

        <Button
          onClick={handlePubliserClick}
          variant={ButtonVariant.Outline}
          data-testid={TopBarMenu.Deploy}
        >
          {t('top_menu.deploy')}
        </Button>
      </div>
    </div>
  );
};
