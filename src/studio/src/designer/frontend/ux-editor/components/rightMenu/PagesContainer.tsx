/* eslint-disable react/jsx-props-no-spreading */
import { Button, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps, TextField, TextFieldProps, Typography, withStyles } from '@material-ui/core';
import { getLanguageFromKey } from 'app-shared/utils/language';
import * as React from 'react';
import { useSelector } from 'react-redux';
import FormDesignerActionDispatchers from '../../actions/formDesignerActions/formDesignerActionDispatcher';

export default function PagesContainer() {
  const layouts: IFormLayouts = useSelector((state: IAppState) => state.formDesigner.layout.layouts);

  return (
    <Grid
      container={true}
    >
      {Object.keys(layouts || {}).map((layoutName: string, index: number) => {
        return (
          <Grid item={true} xs={12}>
            <PageElement
              name={layoutName}
              pageNumber={index + 1}
            />
          </Grid>
        );
      })}
    </Grid>
  );
}

export interface IPageElementProps {
  name: string;
  pageNumber: number;
}

export function PageElement({
  name,
  pageNumber: index,
}: IPageElementProps) {
  const language = useSelector((state: IAppState) => state.appData.language.language);
  const selectedLayout = useSelector((state: IAppState) => state.formDesigner.layout.selectedLayout);
  const [editMode, setEditMode] = React.useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  function onPageClick() {
    if (selectedLayout !== name) {
      FormDesignerActionDispatchers.updateSelectedLayout(name);
    }
  }

  function onPageSettingsClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }

  function onMenuClose(event: React.SyntheticEvent) {
    event.stopPropagation();
    setAnchorEl(null);
  }

  function onMenuItemClick(event: React.SyntheticEvent, action: 'up' | 'down' | 'edit' | 'delete') {
    event.stopPropagation();
    if (action === 'delete') {
      FormDesignerActionDispatchers.deleteLayout(name);
    } else if (action === 'edit') {
      setEditMode(true);
    }
    setAnchorEl(null);
  }

  function handleOnBlur(event: any) {
    setEditMode(false);
    FormDesignerActionDispatchers.updateLayoutName(name, event.target.value.trim());
  }

  return (
    <Button
      style={{
        width: '100%',
        fontSize: '1.4rem',
        fontWeight: 400,
        textTransform: 'unset',
      }}
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
          {!editMode && `${getLanguageFromKey('right_menu.page', language)} ${index} - ${name}`}
          {editMode &&
            <InlineTextField onBlur={handleOnBlur} />
          }
        </Grid>
        <Grid
          item={true}
          xs={2}
        >
          <IconButton
            onClick={onPageSettingsClick}
            style={{ marginLeft: '1.0rem' }}
          >
            <i className='fa fa-ellipsismenu' style={{ width: 'auto' }}/>
          </IconButton>
        </Grid>
      </Grid>
      <PageMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onMenuClose}
      >
        <MenuItem onClick={(event) => onMenuItemClick(event, 'up')}>
          <MenuItemContent
            text={getLanguageFromKey('right_menu.page_menu_up', language)}
            iconClass='fa fa-arrowup'
          />
        </MenuItem>
        <MenuItem onClick={(event) => onMenuItemClick(event, 'down')}>
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
    </Button>
  );
}

export interface IMenuItemContent {
  text: string;
  iconClass: string;
}

export function MenuItemContent({ text, iconClass }: IMenuItemContent) {
  return (
    <>
      <MenuItemIcon>
        <i className={iconClass} />
      </MenuItemIcon>
      <ListItemText disableTypography={true}>
        <Typography variant='caption'>
          {text}
        </Typography>
      </ListItemText>
    </>
  );
}

export const InlineTextField = (props: TextFieldProps) => (
  <TextField
    inputProps={{ style: { fontSize: '14px' }}}
    {...props}
  />
);

export const PageMenu = withStyles({
  paper: {
    border: '1px solid #d3d4d5',
  },
})((props: MenuProps) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'center',
    }}
    transformOrigin={{
      vertical: 'top',
      horizontal: 'center',
    }}
    {...props}
  />
));

export const MenuItemIcon = withStyles({
  root: {
    minWidth: '3.0rem',
  },
})(ListItemIcon);
