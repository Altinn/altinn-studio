import * as React from 'react';
import { IconButton, Divider, makeStyles } from '@material-ui/core';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { getTranslation } from '../utils';
import { ILanguage, ObjectKind } from '../types';

export interface SchemaItemLabelProps {
  icon: string;
  label: string;
  language: ILanguage;
  limitedItem?: boolean,
  onAddProperty?: (type: ObjectKind) => void;
  onAddReference?: (type: ObjectKind) => void;
  onAddCombination?: (type: ObjectKind) => void;
  onDelete?: () => void;
  onImport?: () => void;
  onPromote?: () => void;
  onGoToType?: () => void;
}

const useStyles = makeStyles({
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
});

export const SchemaItemLabel = (props: SchemaItemLabelProps) => {
  const [contextAnchor, setContextAnchor] = React.useState<any>(null);
  const classes = useStyles();
  const handleContextMenuClick = (e: React.SyntheticEvent) => {
    setContextAnchor(e.currentTarget);
    e.stopPropagation();
  };
  const handleAddNode = (e: React.SyntheticEvent, type: ObjectKind) => {
    setContextAnchor(null);
    e.stopPropagation();
    switch (type) {
      case 'combination':
        props?.onAddCombination?.(type);
        break;
      case 'reference':
        props?.onAddReference?.(type);
        break;
      case 'field':
      default:
        props?.onAddProperty?.(type);
    }
  };
  const handlePromoteClick = (e: React.SyntheticEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
    props.onPromote?.();
  };
  const handleDeleteClick = (e: React.SyntheticEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
    props.onDelete?.();
  };
  const handleGoToType = (event: React.SyntheticEvent) => {
    setContextAnchor(null);
    event.stopPropagation();
    props.onGoToType?.();
  };

  const handleCloseContextMenu = (e: React.SyntheticEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
  };
  return (
    <div className={classes.propertiesLabel}>
      <div className={classes.label}>
        <span className={classes.iconContainer}>
          <i className={`fa ${props.icon}`} style={{ color: 'white', textAlign: 'center' }} />
        </span> {props.label}
      </div>
      <IconButton
        className={classes.contextButton}
        aria-controls='simple-menu'
        aria-haspopup='true'
        id='open-context-menu-button'
        onClick={handleContextMenuClick}
      ><i className='fa fa-ellipsismenu' />
      </IconButton>
      <AltinnMenu
        id='root-properties-context-menu'
        anchorEl={contextAnchor}
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        {props.onAddReference && !props.limitedItem &&
          <AltinnMenuItem
            id='add-reference-to-node-button'
            key='add_reference'
            onClick={(event) => handleAddNode(event, 'reference')} text={getTranslation('add_reference', props.language)}
            iconClass='fa fa-datamodel-ref'
          />
        }
        {props.onAddProperty && !props.limitedItem &&
          <AltinnMenuItem
            id='add-field-to-node-button'
            key='add_field'
            onClick={(event) => handleAddNode(event, 'field')} text={getTranslation('add_field', props.language)}
            iconClass='fa fa-datamodel-properties'
          />
        }
        {props.onAddCombination && !props.limitedItem &&
          <AltinnMenuItem
            id='add-combination-to-node-button'
            key='add_combination'
            onClick={(event) => handleAddNode(event, 'combination')} text={getTranslation('add_combination', props.language)}
            iconClass='fa fa-group'
          />
        }
        {props.onPromote && !props.limitedItem && <AltinnMenuItem
          id='promote-item-button'
          key='promote'
          onClick={handlePromoteClick} text={getTranslation('promote', props.language)}
          iconClass='fa fa-arrowup'
        />}
        {props.onGoToType && <AltinnMenuItem
          id='go-to-type-button'
          key='go_to_type'
          onClick={handleGoToType} text={getTranslation('go_to_type', props.language)}
          iconClass='fa fa-datamodel-ref'
        />}
        {props.onDelete &&
          [
            <Divider key='delete-divider' />,
            <AltinnMenuItem
              id='delete-node-button'
              key='delete'
              onClick={handleDeleteClick} text={getTranslation('delete', props.language)}
              iconClass='fa fa-trash'
            />,
          ]
        }
      </AltinnMenu>
    </div>);
};
