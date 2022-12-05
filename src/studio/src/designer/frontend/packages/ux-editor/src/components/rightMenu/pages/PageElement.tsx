import React from 'react';
import { Button, ButtonVariant, TextField } from '@altinn/altinn-design-system';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { useDispatch, useSelector } from 'react-redux';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components/';
import ConfirmModal from '../ConfirmModal';
import { FormLayoutActions } from '../../../features/formDesigner/formLayout/formLayoutSlice';
import type { IAppState } from '../../../types/global';
import { EllipsisV, Right } from '@navikt/ds-icons';
import classes from './PageElement.module.css';
import { Divider } from 'app-shared/primitives';
import cn from 'classnames';

export interface IPageElementProps {
  name: string;
  invalid?: boolean;
}

export function PageElement({ name, invalid }: IPageElementProps) {
  const dispatch = useDispatch();

  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);
  const selectedLayout = useSelector(
    (state: IAppState) => state.formDesigner.layout.selectedLayout
  );
  const layoutOrder = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order
  );
  const [editMode, setEditMode] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [newName, setNewName] = React.useState<string>('');
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [deleteAnchorEl, setDeleteAnchorEl] = React.useState<null | Element>(null);
  const disableUp = layoutOrder.indexOf(name) === 0;
  const disableDown = layoutOrder.indexOf(name) === layoutOrder.length - 1;

  const onPageClick = () => {
    if (invalid) {
      alert(`${name}: ${t('right_menu.pages.invalid_page_data')}`);
    }
    else if (selectedLayout !== name) {
      dispatch(FormLayoutActions.updateSelectedLayout({ selectedLayout: name }));
    }
  };

  const onPageSettingsClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const onMenuClose = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    setMenuAnchorEl(null);
  };

  const onMenuItemClick = (
    event: React.SyntheticEvent,
    action: 'up' | 'down' | 'edit' | 'delete'
  ) => {
    event.stopPropagation();
    if (action === 'delete') {
      setDeleteAnchorEl(event.currentTarget);
    } else if (action === 'edit') {
      setEditMode(true);
      setNewName(name);
    } else if (action === 'up' || action === 'down') {
      dispatch(
        FormLayoutActions.updateLayoutOrder({
          layout: name,
          direction: action,
        })
      );
    }
    setMenuAnchorEl(null);
  };

  const handleOnBlur = (event: any) => {
    event.stopPropagation();
    setEditMode(false);
    if (!errorMessage && name !== newName) {
      dispatch(FormLayoutActions.updateLayoutName({ oldName: name, newName }));
    }
  };

  const pageNameExists = (candidateName: string): boolean => {
    return layoutOrder.some(
      (pageName: string) => pageName.toLowerCase() === candidateName.toLowerCase()
    );
  };

  const handleOnChange = (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const nameRegex = new RegExp('^[a-zA-Z0-9_\\-\\.]*$');
    const newNameCandidate = event.target.value.replace(/[/\\?%*:|"<>]/g, '-').trim();
    if (pageNameExists(newNameCandidate)) {
      setErrorMessage(t('right_menu.pages_error_unique'));
    } else if (!newNameCandidate) {
      setErrorMessage(t('right_menu.pages_error_empty'));
    } else if (newNameCandidate.length >= 30) {
      setErrorMessage(t('right_menu.pages_error_length'));
    } else if (!newNameCandidate.match(nameRegex)) {
      setErrorMessage(t('right_menu.pages_error_format'));
    } else {
      setErrorMessage('');
      setNewName(newNameCandidate);
    }
  };

  const handleKeyPress = (event: any) => {
    event.stopPropagation();
    if (event.key === 'Enter' && !errorMessage && name !== newName) {
      dispatch(FormLayoutActions.updateLayoutName({ oldName: name, newName }));
      setEditMode(false);
    } else if (event.key === 'Escape') {
      setEditMode(false);
      setNewName('');
    }
  };

  const handleConfirmDeleteClose = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    setDeleteAnchorEl(null);
  };

  const handleConfirmDelete = (event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    setDeleteAnchorEl(null);
    dispatch(FormLayoutActions.deleteLayout({ layout: name }));
  };

  return (
    <div className={cn({ [classes.selected]: selectedLayout === name, [classes.invalid]: invalid })}>
      <div className={classes.elementContainer}>
        <div>
          <Right
            visibility={selectedLayout === name ? 'visible' : 'hidden'}
            style={{
              width: 'auto',
              color: '#022F51',
            }}
          />
        </div>
        <div onClick={onPageClick}>
          {!editMode && name}
          {editMode && (
            <>
              <TextField
                onBlur={handleOnBlur}
                onKeyDown={handleKeyPress}
                onChange={handleOnChange}
                defaultValue={name}
                isValid={!errorMessage}
              />
              <span className={classes.errorMessage}>{errorMessage}</span>
            </>
          )}
        </div>
        <div>
          <Button
            className={classes.ellipsisButton}
            icon={<EllipsisV />}
            onClick={onPageSettingsClick}
            style={menuAnchorEl ? { visibility: 'visible' } : {}}
            variant={ButtonVariant.Quiet}
          />
        </div>
      </div>

      <AltinnMenu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={onMenuClose}>
        <AltinnMenuItem
          onClick={(event) => onMenuItemClick(event, 'up')}
          disabled={disableUp || invalid}
          text={t('right_menu.page_menu_up')}
          iconClass='fa fa-arrowup'
          id='move-page-up-button'
        />
        <AltinnMenuItem
          onClick={(event) => onMenuItemClick(event, 'down')}
          disabled={disableDown || invalid}
          text={t('right_menu.page_menu_down')}
          iconClass='fa fa-arrowdown'
          id='move-page-down-button'
        />
        <AltinnMenuItem
          onClick={(event) => onMenuItemClick(event, 'edit')}
          text={t('right_menu.page_menu_edit')}
          iconClass='fa fa-write'
          id='edit-page-button'
          disabled={invalid}
        />
        <Divider inMenu />
        <AltinnMenuItem
          onClick={(event) => onMenuItemClick(event, 'delete')}
          text={t('right_menu.page_menu_delete')}
          iconClass='fa fa-trash'
          id='delete-page-button'
        />
      </AltinnMenu>
      <ConfirmModal
        anchorEl={deleteAnchorEl}
        open={Boolean(deleteAnchorEl)}
        header={t('right_menu.page_delete_header')}
        description={getParsedLanguageFromKey('right_menu.page_delete_information', language, [
          name,
        ])}
        confirmText={t('right_menu.page_delete_confirm')}
        cancelText={t('right_menu.page_delete_cancel')}
        onClose={handleConfirmDeleteClose}
        onCancel={handleConfirmDeleteClose}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
