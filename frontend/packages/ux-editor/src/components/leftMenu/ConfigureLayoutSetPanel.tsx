import React, { useState, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import classes from "./LeftMenu.module.css";
import { useConfigureLayoutSetMutation } from "../../hooks/mutations/useConfigureLayoutSetMutation";
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { InformationIcon } from '@navikt/aksel-icons';

export const ConfigureLayoutSetPanel = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const configureLayoutSetMutation = useConfigureLayoutSetMutation(org, app);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function handleConfigureLayoutSet() {
    configureLayoutSetMutation.mutate();
  }

  const handlePopoverOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className={classes.configureLayoutSet}>
      <Button
        className={classes.configureLayoutSetButton}
        variant={ButtonVariant.Quiet}
        onClick={handleConfigureLayoutSet}>
        {t('left_menu.configure_layout_sets')}
      </Button>
      <div
        className={classes.componentHelpIcon}
        aria-haspopup="true"
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}>
        <Button
          icon={<InformationIcon/>}
          variant={ButtonVariant.Quiet}
        />
      </div>
      <Popover
        open={!!anchorEl}
        onClose={handlePopoverClose}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
        sx={{ pointerEvents: 'none', }}
      >
        <div className={classes.configureLayoutSetInfo}>
          {t('left_menu.configure_layout_sets_info')}
        </div>
      </Popover>
    </div>
  );
};
