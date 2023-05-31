import React, { ChangeEvent, KeyboardEvent, useEffect, useState, useRef, MouseEvent } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useParams } from 'react-router-dom';
import classes from './ConfigureLayoutSetPanel.module.css';
import { useConfigureLayoutSetMutation } from '../../hooks/mutations/useConfigureLayoutSetMutation';
import { Button, ButtonVariant, TextField } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { InformationIcon } from '@navikt/aksel-icons';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { validateLayoutNameAndLayoutSetName } from '../../utils/validationUtils/validateLayoutNameAndLayoutSetName';

export const ConfigureLayoutSetPanel = () => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const configureLayoutSetMutation = useConfigureLayoutSetMutation(org, app);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [layoutSetName, setLayoutSetName] = useState<string>('');
  const [editLayoutSetName, setEditLayoutSetName] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const configPanelRef = useRef<HTMLDivElement>(null);

  function handleConfigureLayoutSet() {
    if (layoutSetName === '') {
      setErrorMessage(t('left_menu.pages_error_empty'));
    } else {
      configureLayoutSetMutation.mutate({ layoutSetName });
    }
  }

  const handlePopoverOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setPopoverOpen(true);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setPopoverOpen(false);
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleConfigureLayoutSet()
      setEditLayoutSetName(false);
    } else if (event.key === 'Escape') {
      setEditLayoutSetName(false);
      setLayoutSetName('');
    }
  };

  const handleClickOutside = (event: Event) => {
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
    const newNameCandidate = event.target.value.replace(/[/\\?%*:|"<>]/g, '-').trim();
    if (!newNameCandidate) {
      setErrorMessage(t('left_menu.pages_error_empty'));
    } else if (newNameCandidate.length >= 30) {
      setErrorMessage(t('left_menu.pages_error_length'));
    } else if (!validateLayoutNameAndLayoutSetName(newNameCandidate)) {
      setErrorMessage(t('left_menu.pages_error_format'));
    } else {
      setErrorMessage('');
      setLayoutSetName(newNameCandidate);
    }
  };

  return (
    <div
      ref={configPanelRef}
      className={classes.configureLayoutSet}
    >
      {editLayoutSetName ? (
        <div
          className={classes.configureLayoutSetName}
        >
          <span>{t('left_menu.configure_layout_sets_name')}</span>
          <TextField
            onKeyDown={handleKeyPress}
            onChange={handleOnChange}
            defaultValue={layoutSetName}
            isValid={!errorMessage}
          />
          <div className={classes.errorMessage}>{errorMessage}</div>
        </div>
      ) : (
        <Button
          className={classes.configureLayoutSetButton}
          variant={ButtonVariant.Quiet}
          onClick={handleConfigureLayoutSetButtonClick}
        >
          {t('left_menu.configure_layout_sets')}
        </Button>
      )}
      <div
        aria-haspopup="true"
        onMouseEnter={handlePopoverOpen}
      >
        <InformationIcon className={classes.informationButton}/>
      </div>
      {popoverOpen && (
        <Popover
          open={!!anchorEl}
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <div className={classes.configureLayoutSetInfo} onMouseLeave={handlePopoverClose}>
            <Trans i18nKey={'left_menu.configure_layout_sets_info'}>
              <a
                href={altinnDocsUrl('app/development/ux/pages/layout-sets/')}
                target='_newTab'
                rel='noopener noreferrer'
              />
            </Trans>
          </div>
        </Popover>
      )}
    </div>
  );
};
