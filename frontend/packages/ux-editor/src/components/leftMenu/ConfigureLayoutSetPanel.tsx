import React, { ChangeEvent, useEffect, useState, useRef, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import classes from "./LeftMenu.module.css";
import { useConfigureLayoutSetMutation } from "../../hooks/mutations/useConfigureLayoutSetMutation";
import { Button, ButtonVariant, TextField  } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { InformationIcon } from '@navikt/aksel-icons';

export const ConfigureLayoutSetPanel = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const configureLayoutSetMutation = useConfigureLayoutSetMutation(org, app);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [layoutSetName, setLayoutSetName] = useState<string>('');
  const [editLayoutSetName, setEditLayoutSetName] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const configPanelRef = useRef<HTMLDivElement>(null);

  function handleConfigureLayoutSet() {
    if (layoutSetName === '') {
      setErrorMessage(t('left_menu.pages_error_empty'));
    }
    else {
      configureLayoutSetMutation.mutate({ layoutSetName });
    }
  }

  const handlePopoverOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const handleKeyPress = async (event: any) => {
    if (event.key === 'Enter') {
      handleConfigureLayoutSet()
      setEditLayoutSetName(false);
    } else if (event.key === 'Escape') {
      setEditLayoutSetName(false);
      setLayoutSetName('');
    }
  };

  const handleClickOutside = (event: any) => {
    if (configPanelRef.current && !configPanelRef.current.contains(event.target as Node)) {
      setEditLayoutSetName(false);
      setLayoutSetName('');
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleConfigureLayoutSetButtonClick = () => {
    setEditLayoutSetName(!editLayoutSetName);
  }

  const handleOnChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const nameRegex = new RegExp('^[a-zA-Z0-9_\\-\\.]*$');
    const newNameCandidate = event.target.value.replace(/[/\\?%*:|"<>]/g, '-').trim();
    if (!newNameCandidate) {
      setErrorMessage(t('left_menu.pages_error_empty'));
    } else if (newNameCandidate.length >= 30) {
      setErrorMessage(t('left_menu.pages_error_length'));
    } else if (!newNameCandidate.match(nameRegex)) {
      setErrorMessage(t('left_menu.pages_error_format'));
    } else {
      setErrorMessage('');
      setLayoutSetName(newNameCandidate);
    }
  };

  return (
    <div
      ref={configPanelRef}
      className={classes.configureLayoutSet}>
      {editLayoutSetName ? (
        <>
          <span>{t('left_menu.configure_layout_sets_name')}</span>
          <TextField
          onKeyDown={handleKeyPress}
          onChange={handleOnChange}
          defaultValue={layoutSetName}
          isValid={!errorMessage}
        />
        </>) : (
      <Button
        className={classes.configureLayoutSetButton}
        variant={ButtonVariant.Quiet}
        onClick={handleConfigureLayoutSetButtonClick}>
        {t('left_menu.configure_layout_sets')}
      </Button>)
      }
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
