import type { ChangeEvent, KeyboardEvent, MouseEvent } from 'react';
import React, { useEffect, useState, useRef, useCallback, useId } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import classes from './ConfigureLayoutSetPanel.module.css';
import { useConfigureLayoutSetMutation } from '../../hooks/mutations/useConfigureLayoutSetMutation';
import { Paragraph, Textfield } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { InformationIcon } from '@navikt/aksel-icons';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { validateLayoutNameAndLayoutSetName } from '../../utils/validationUtils/validateLayoutNameAndLayoutSetName';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { StudioButton } from '@studio/components';

export const ConfigureLayoutSetPanel = () => {
  const inputLayoutSetNameId = useId();
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();
  const configureLayoutSetMutation = useConfigureLayoutSetMutation(org, app);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [layoutSetName, setLayoutSetName] = useState<string>('');
  const [editLayoutSetName, setEditLayoutSetName] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const configPanelRef = useRef<HTMLDivElement>(null);

  const handleConfigureLayoutSet = async (): Promise<void> => {
    if (layoutSetName === '') {
      setErrorMessage(t('left_menu.pages_error_empty'));
    } else {
      await configureLayoutSetMutation.mutateAsync({ layoutSetName });
    }
  };

  const handleTogglePopOver = (event?: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event ? event.currentTarget : null);
    setPopoverOpen(!!event);
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    const shouldSave = event.key === 'Enter';
    if (shouldSave) {
      handleConfigureLayoutSet();
      setEditLayoutSetName(false);
      return;
    }

    const shouldCancel = event.key === 'Escape';
    if (shouldCancel) {
      closePanelAndResetLayoutSetName();
    }
  };

  const handleClickOutside = useCallback((event: Event): void => {
    const target = event.target as HTMLElement;

    // If the click is outside the configPanelRef, close the panel and reset the layoutSetName
    if (!configPanelRef.current?.contains(target)) {
      closePanelAndResetLayoutSetName();
    }
  }, []);

  const closePanelAndResetLayoutSetName = (): void => {
    setEditLayoutSetName(false);
    setLayoutSetName('');
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  const toggleConfigureLayoutSetName = (): void => {
    setEditLayoutSetName((prevEditLayoutSetName) => !prevEditLayoutSetName);
  };

  const handleOnNameChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
    // The Regex below replaces all illegal characters with a dash
    const newNameCandidate = event.target.value.replace(/[/\\?%*:|"<>]/g, '-').trim();

    const error = validateLayoutSetName(newNameCandidate);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setErrorMessage('');
    setLayoutSetName(newNameCandidate);
  };

  const validateLayoutSetName = (newLayoutSetName?: string): string | null => {
    if (!newLayoutSetName) {
      return t('left_menu.pages_error_empty');
    }

    if (newLayoutSetName.length >= 30) {
      return t('left_menu.pages_error_length');
    }

    if (!validateLayoutNameAndLayoutSetName(newLayoutSetName)) {
      return t('left_menu.pages_error_format');
    }
    return null;
  };

  return (
    <div ref={configPanelRef} className={classes.configureLayoutSet}>
      {editLayoutSetName ? (
        <div className={classes.configureLayoutSetName}>
          <label className={classes.label} htmlFor={inputLayoutSetNameId}>
            {t('left_menu.configure_layout_sets_name')}
          </label>
          <Textfield
            id={inputLayoutSetNameId}
            onKeyDown={handleKeyPress}
            onChange={handleOnNameChange}
            defaultValue={layoutSetName}
            error={errorMessage}
            aria-describedby={errorMessage && 'configure-layout-set-name-error'}
            aria-invalid={!!errorMessage}
          />
          {errorMessage && (
            <Paragraph id='configure-layout-set-name-error' as='span' size='small'>
              {errorMessage}
            </Paragraph>
          )}
        </div>
      ) : (
        <StudioButton
          className={classes.configureLayoutSetButton}
          variant='tertiary'
          onClick={toggleConfigureLayoutSetName}
          size='small'
        >
          {t('left_menu.configure_layout_sets')}
        </StudioButton>
      )}
      <div aria-haspopup='true' onMouseEnter={handleTogglePopOver}>
        <InformationIcon className={classes.informationButton} />
      </div>
      {popoverOpen && (
        <Popover
          open={!!anchorEl}
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Paragraph
            size='small'
            className={classes.configureLayoutSetInfo}
            onMouseLeave={() => handleTogglePopOver()}
          >
            <Trans i18nKey={'left_menu.configure_layout_sets_info'}>
              <a
                href={altinnDocsUrl('app/development/ux/pages/layout-sets/')}
                target='_newTab'
                rel='noopener noreferrer'
              />
            </Trans>
          </Paragraph>
        </Popover>
      )}
    </div>
  );
};
