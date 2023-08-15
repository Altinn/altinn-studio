import React, { useEffect, useState } from 'react';
import classes from './PageElement.module.css';
import cn from 'classnames';
import type { ChangeEvent, KeyboardEvent, SyntheticEvent, MouseEvent } from 'react';
import { Button, ButtonVariant, TextField } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { MenuElipsisVerticalIcon } from '@navikt/aksel-icons';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { deepCopy } from 'app-shared/pure';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams } from 'react-router-dom';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useDeleteLayoutMutation } from '../../hooks/mutations/useDeleteLayoutMutation';
import { useUpdateLayoutNameMutation } from '../../hooks/mutations/useUpdateLayoutNameMutation';
import { selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { validateLayoutNameAndLayoutSetName } from '../../utils/validationUtils/validateLayoutNameAndLayoutSetName';
import { AltinnConfirmDialog } from 'app-shared/components';
import { firstAvailableLayout } from '../../utils/formLayoutsUtils';

export interface IPageElementProps {
  name: string;
  invalid?: boolean;
}

export function PageElement({ name, invalid }: IPageElementProps) {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout = searchParams.get('layout');
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const { t } = useTranslation();
  const { org, app } = useParams();
  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const { mutate: updateLayoutOrder } = useUpdateLayoutOrderMutation(org, app, selectedLayoutSet);
  const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, selectedLayoutSet);
  const { mutate: updateLayoutName } = useUpdateLayoutNameMutation(org, app, selectedLayoutSet);
  const layoutOrder = formLayoutSettings?.pages.order;
  const [editMode, setEditMode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const disableUp = layoutOrder.indexOf(name) === 0;
  const disableDown = layoutOrder.indexOf(name) === layoutOrder.length - 1;
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();

  useEffect(() => {
    if (name !== selectedLayout) {
      setEditMode(false);
    }
  }, [name, selectedLayout]);

  const onPageClick = () => {
    if (invalid) {
      alert(`${name}: ${t('left_menu.pages.invalid_page_data')}`);
    } else if (selectedLayout !== name) {
      dispatch(FormLayoutActions.updateSelectedLayout(name));
      setSearchParams({ ...deepCopy(searchParams), layout: name });
    }
  };

  const onPageSettingsClick = (event: MouseEvent<HTMLButtonElement>) =>
    setMenuAnchorEl(event.currentTarget);

  const onMenuClose = (_event: SyntheticEvent) => setMenuAnchorEl(null);

  const onMenuItemClick = (event: SyntheticEvent, action: 'up' | 'down' | 'edit' | 'delete') => {
    if (action === 'delete') {
      setIsConfirmDeleteDialogOpen((prevState) => !prevState);
    } else {
      if (action === 'edit') {
        setEditMode(true);
        setNewName(name);
      } else if (action === 'up' || action === 'down') {
        updateLayoutOrder({ layoutName: name, direction: action });
      }
      setMenuAnchorEl(null);
    }
  };

  const handleOnBlur = (_event: any) => {
    setEditMode(false);
    if (!errorMessage && name !== newName) {
      updateLayoutName({ oldName: name, newName });
      setSearchParams({ ...deepCopy(searchParams), layout: newName });
    } else {
      setNewName('');
      setErrorMessage('');
    }
  };

  const pageNameExists = (candidateName: string): boolean =>
    layoutOrder.some((p: string) => p.toLowerCase() === candidateName.toLowerCase());

  const handleOnChange = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newNameCandidate = event.target.value.replace(/[/\\?%*:|"<>]/g, '-').trim();
    if (pageNameExists(newNameCandidate)) {
      setErrorMessage(t('left_menu.pages_error_unique'));
    } else if (!newNameCandidate) {
      setErrorMessage(t('left_menu.pages_error_empty'));
    } else if (newNameCandidate.length >= 30) {
      setErrorMessage(t('left_menu.pages_error_length'));
    } else if (!validateLayoutNameAndLayoutSetName(newNameCandidate)) {
      setErrorMessage(t('left_menu.pages_error_format'));
    } else {
      setErrorMessage('');
      setNewName(newNameCandidate);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !errorMessage && name !== newName) {
      updateLayoutName({ oldName: name, newName });
      setSearchParams({ ...deepCopy(searchParams), layout: newName });
      setEditMode(false);
    } else if (event.key === 'Escape') {
      setEditMode(false);
      setNewName('');
    }
  };

  const handleConfirmDelete = () => {
    deleteLayout(name);
    if (selectedLayout === name) {
      const layoutToSelect = firstAvailableLayout(name, layoutOrder);
      setSearchParams({ layout: layoutToSelect });
    }
  };

  return (
    <div
      className={cn({ [classes.selected]: selectedLayout === name, [classes.invalid]: invalid })}
    >
      <div className={classes.elementContainer}>
        <div className={classes.pageContainer}>
          {editMode ? (
            <div className={classes.pageField}>
              <TextField
                onBlur={handleOnBlur}
                onKeyDown={handleKeyPress}
                onChange={handleOnChange}
                defaultValue={name}
                isValid={!errorMessage}
              />
              <div className={classes.errorMessage}>{errorMessage}</div>
            </div>
          ) : (
            <div className={classes.pageButton} onClick={onPageClick}>
              {name}
            </div>
          )}
        </div>
        <Button
          className={classes.ellipsisButton}
          icon={<MenuElipsisVerticalIcon />}
          onClick={onPageSettingsClick}
          style={menuAnchorEl ? { visibility: 'visible' } : {}}
          variant={ButtonVariant.Quiet}
          title={t('general.options')}
          size='small'
        />
      </div>
      <AltinnMenu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={onMenuClose}>
        {layoutOrder.includes(name) && (
          <AltinnMenuItem
            onClick={(event) => onMenuItemClick(event, 'up')}
            disabled={disableUp || invalid}
            text={t('left_menu.page_menu_up')}
            iconClass='fa fa-arrowup'
            id='move-page-up-button'
          />
        )}
        {layoutOrder.includes(name) && (
          <AltinnMenuItem
            onClick={(event) => onMenuItemClick(event, 'down')}
            disabled={disableDown || invalid}
            text={t('left_menu.page_menu_down')}
            iconClass='fa fa-arrowdown'
            id='move-page-down-button'
          />
        )}
        <AltinnMenuItem
          onClick={(event) => onMenuItemClick(event, 'edit')}
          text={t('left_menu.page_menu_edit')}
          iconClass='fa fa-write'
          id='edit-page-button'
          disabled={invalid}
        />
        <Divider marginless />
        <AltinnConfirmDialog
          open={isConfirmDeleteDialogOpen}
          confirmText={t('left_menu.page_delete_confirm')}
          onConfirm={() => {
            handleConfirmDelete();
            setMenuAnchorEl(null);
          }}
          onClose={() => {
            setIsConfirmDeleteDialogOpen(false);
            setMenuAnchorEl(null);
          }}
          trigger={
            <AltinnMenuItem
              onClick={(event) => onMenuItemClick(event, 'delete')}
              text={t('left_menu.page_menu_delete')}
              iconClass='fa fa-trash'
              id='delete-page-button'
            />
          }
        >
          <p>{t('left_menu.page_delete_text')}</p>
          <p>{t('left_menu.page_delete_information')}</p>
        </AltinnConfirmDialog>
      </AltinnMenu>
    </div>
  );
}
