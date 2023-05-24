import React, { useState, MouseEvent } from 'react';
import classes from './AltinnHeaderButtons.module.css';
import { Button } from '@digdir/design-system-react';
import Popover from '@mui/material/Popover';
import { useTranslation } from 'react-i18next';
import { AltinnButtonActionItem } from '../altinnHeader/types';
import { InformationIcon } from '@navikt/aksel-icons';

export interface AltinnHeaderButtonProps {
  action: AltinnButtonActionItem;
}

export const AltinnHeaderButton = ({ action }: AltinnHeaderButtonProps) => {
  const { t } = useTranslation();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  if (!action) return null;

  const handlePopoverOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <Button
        className={action.headerButtonsClasses}
        key={action.menuKey}
        onClick={action.handleClick}
        variant={action.buttonVariant}
        data-testid={action.menuKey}
      >
        {t(action.title)}
        {action.inBeta && (
          <>
            <span
              aria-haspopup='true'
              onMouseEnter={handlePopoverOpen}
              onMouseLeave={handlePopoverClose}
            >
              <InformationIcon className={classes.infoIcon} aria-label={'information'} />
            </span>
            <Popover
              open={!!anchorEl}
              anchorEl={anchorEl}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              disableRestoreFocus
              sx={{ pointerEvents: 'none' }}
            >
              <span className={classes.infoPreviewIsBetaMessage}>
                {t('top_menu.preview_is_beta_message')}
              </span>
            </Popover>
          </>
        )}
      </Button>
    </div>
  );
};
