import * as React from 'react';
import { IconButton, Menu, MenuItem, makeStyles } from '@material-ui/core';
import { ILanguage } from '../types';
import { getTranslation } from '../utils';

export interface SchemaItemLabelProps {
  language: ILanguage;
  onAddProperty: () => void;
}

export const SchemaItemLabel = (props: SchemaItemLabelProps) => {
  const classes = makeStyles({
    contextButton: {
      borderRadius: 60,
      margin: 0,
      padding: 10,
      display: 'none',
      '.MuiTreeItem-root :hover > &': {
        display: 'block',
      },
    },
    propertiesLabel: {
      display: 'flex',
      alignItems: 'center',
      padding: 8,
    },
    label: {
      flexGrow: 1,
    },
    iconContainer: {
      background: '#022f51',
      textAlign: 'center',
      padding: '5px 0px 5px 0px',
      marginRight: 4,
      fontSize: '10px',
    },
  })();

  const [contextAnchor, setContextAnchor] = React.useState<any>(null);

  const handleContextMenuClick = (e: React.MouseEvent) => {
    setContextAnchor(e.currentTarget);
    e.stopPropagation();
  };
  const handleAddPropertyClick = (e: React.MouseEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
    props.onAddProperty();
  };

  const handleCloseContextMenu = (e: React.MouseEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
  };
  return (
    <div className={classes.propertiesLabel}>
      <div className={classes.label}>
        <span className={classes.iconContainer}>
          <i className='fa fa-datamodel-properties' style={{ color: 'white', textAlign: 'center' }} />
        </span> {getTranslation('schema_editor.properties', props.language)}
      </div>
      <IconButton
        className={classes.contextButton}
        aria-controls='simple-menu'
        aria-haspopup='true'
        id='open-context-menu-button'
        onClick={handleContextMenuClick}
      ><i className='fa fa-ellipsismenu'/>
      </IconButton>
      <Menu
        id='root-properties-context-menu'
        anchorEl={contextAnchor}
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        <MenuItem onClick={handleAddPropertyClick}><i className='fa fa-plus'/>{getTranslation('schema_editor.add_property', props.language)}</MenuItem>
      </Menu>
    </div>);
};
