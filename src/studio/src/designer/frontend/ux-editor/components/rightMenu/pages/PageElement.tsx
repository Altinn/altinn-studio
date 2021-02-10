/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { getLanguageFromKey, getParsedLanguageFromKey } from 'app-shared/utils/language';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Grid, IconButton, makeStyles, MenuItem, TextField, TextFieldProps } from '@material-ui/core';
import ConfirmModal from '../ConfirmModal';
import { MenuItemContent } from './PageMenuItem';
import PageMenu from './PageMenu';
import { FormLayoutActions } from '../../../features/formDesigner/formLayout/formLayoutSlice';

export interface IPageElementProps {
  name: string;
}

const useStyles = makeStyles({
  ellipsisButton: {
    marginLeft: '1.2rem',
    visibility: 'hidden',
  },
  mainButton: {
    width: '100%',
    fontSize: '1.4rem',
    fontWeight: 400,
    textTransform: 'unset',
    '&:hover #ellipsis-button': {
      visibility: 'visible',
    },
    '&:focus #ellipsis-button': {
      visibility: 'visible',
    },
    '&:focus-within #ellipsis-button': {
      visibility: 'visible',
    },

  },
});

export default function PageElement({
  name,
}: IPageElementProps) {
  const classes = useStyles();
  const dispatch = useDispatch();

  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const selectedLayout = useSelector((state: IAppState) => state.formDesigner.layout.selectedLayout);
  const layoutOrder = useSelector((state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order);
  const [editMode, setEditMode] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [newName, setNewName] = React.useState<string>('');
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [deleteAnchorEl, setDeleteAnchorEl] = React.useState<null | Element>(null);
  const disableUp = (layoutOrder.indexOf(name) === 0);
  const disableDown = (layoutOrder.indexOf(name) === (layoutOrder.length - 1));

  function onPageClick() {
    if (selectedLayout !== name) {
      dispatch(FormLayoutActions.updateSelectedLayout({ selectedLayout: name }));
    }
  }

  function onPageSettingsClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  }

  function onMenuClose(event: React.SyntheticEvent) {
    event.stopPropagation();
    setMenuAnchorEl(null);
  }

  function onMenuItemClick(event: React.SyntheticEvent, action: 'up' | 'down' | 'edit' | 'delete') {
    event.stopPropagation();
    if (action === 'delete') {
      setDeleteAnchorEl(event.currentTarget);
    } else if (action === 'edit') {
      setEditMode(true);
      setNewName(name);
    } else if (action === 'up' || action === 'down') {
      dispatch(FormLayoutActions.updateLayoutOrder({ layout: name, direction: action }));
    }
    setMenuAnchorEl(null);
  }

  function handleOnBlur(event: any) {
    event.stopPropagation();
    setEditMode(false);
    if (!errorMessage && name !== newName) {
      dispatch(FormLayoutActions.updateLayoutName({ oldName: name, newName }));
    }
  }

  function pageNameExists(candidateName: string): boolean {
    return layoutOrder.some((pageName: string) => pageName.toLowerCase() === candidateName.toLowerCase());
  }

  function handleOnChange(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) {
    const nameRegex = new RegExp('^[a-zA-Z0-9_\\-\\.]*$');
    const newNameCandidate = event.target.value.replace(/[/\\?%*:|"<>]/g, '-').trim();
    if (pageNameExists(newNameCandidate)) {
      setErrorMessage(getLanguageFromKey('right_menu.pages_error_unique', language));
    } else if (!newNameCandidate) {
      setErrorMessage(getLanguageFromKey('right_menu.pages_error_empty', language));
    } else if (newNameCandidate.length >= 30) {
      setErrorMessage(getLanguageFromKey('right_menu.pages_error_length', language));
    } else if (!newNameCandidate.match(nameRegex)) {
      setErrorMessage(getLanguageFromKey('right_menu.pages_error_format', language));
    } else {
      setErrorMessage('');
      setNewName(newNameCandidate);
    }
  }

  function handleKeyPress(event: any) {
    event.stopPropagation();
    if (event.key === 'Enter') {
      if (!errorMessage && name !== newName) {
        dispatch(FormLayoutActions.updateLayoutName({ oldName: name, newName }));
        setEditMode(false);
      }
    }
    if (event.key === 'Escape') {
      setEditMode(false);
      setNewName('');
    }
  }

  function handleConfirmDeleteClose(event?: React.SyntheticEvent) {
    event?.stopPropagation();
    setDeleteAnchorEl(null);
  }

  function handleConfirmDelete(event?: React.SyntheticEvent) {
    event?.stopPropagation();
    setDeleteAnchorEl(null);
    dispatch(FormLayoutActions.deleteLayout({ layout: name }));
  }

  return (
    <Button
      className={classes.mainButton}
      onClick={onPageClick}
    >
      <Grid
        container={true}
        direction='row'
      >
        <Grid
          item={true} xs={1}
        >
          {(selectedLayout === name) && <i
            className='fa fa-arrowright' style={{
              width: 'auto', color: '#022F51', marginBottom: '0.4rem',
            }}
          />}
        </Grid>
        <Grid
          item={true}
          xs={9}
          style={{ textAlign: 'left', paddingLeft: '1.2rem' }}
        >
          {!editMode && name}
          {editMode &&
            <InlineTextField
              onBlur={handleOnBlur}
              onKeyDown={handleKeyPress}
              onChange={handleOnChange}
              defaultValue={name}
              error={Boolean(errorMessage)}
              helperText={errorMessage}
            />
          }
        </Grid>
        <Grid
          item={true}
          xs={2}
        >
          <IconButton
            onClick={onPageSettingsClick}
            className={classes.ellipsisButton}
            id='ellipsis-button'
            style={menuAnchorEl ? { visibility: 'visible' } : {}}
          >
            <i className='fa fa-ellipsismenu' style={{ width: 'auto' }}/>
          </IconButton>
        </Grid>
      </Grid>
      <PageMenu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={onMenuClose}
      >
        <MenuItem onClick={(event) => onMenuItemClick(event, 'up')} disabled={disableUp}>
          <MenuItemContent
            text={getLanguageFromKey('right_menu.page_menu_up', language)}
            iconClass='fa fa-arrowup'
          />
        </MenuItem>
        <MenuItem onClick={(event) => onMenuItemClick(event, 'down')} disabled={disableDown}>
          <MenuItemContent
            text={getLanguageFromKey('right_menu.page_menu_down', language)}
            iconClass='fa fa-arrowdown'
          />
        </MenuItem>
        <MenuItem onClick={(event) => onMenuItemClick(event, 'delete')}>
          <MenuItemContent
            text={getLanguageFromKey('right_menu.page_menu_delete', language)}
            iconClass='fa fa-trash'
          />
        </MenuItem>
        <MenuItem onClick={(event) => onMenuItemClick(event, 'edit')}>
          <MenuItemContent
            text={getLanguageFromKey('right_menu.page_menu_edit', language)}
            iconClass='fa fa-write'
          />
        </MenuItem>
      </PageMenu>
      <ConfirmModal
        anchorEl={deleteAnchorEl}
        open={Boolean(deleteAnchorEl)}
        header={getLanguageFromKey('right_menu.page_delete_header', language)}
        description={getParsedLanguageFromKey('right_menu.page_delete_information', language, [name])}
        confirmText={getLanguageFromKey('right_menu.page_delete_confirm', language)}
        cancelText={getLanguageFromKey('right_menu.page_delete_cancel', language)}
        onClose={handleConfirmDeleteClose}
        onCancel={handleConfirmDeleteClose}
        onConfirm={handleConfirmDelete}
      />
    </Button>
  );
}

export const InlineTextField = (props: TextFieldProps) => (
  <TextField
    inputProps={{ style: { fontSize: '14px' } }}
    FormHelperTextProps={{ style: { fontSize: '12px' } }}
    {...props}
  />
);
