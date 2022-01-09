import React from 'react';
import { Grid, makeStyles, createTheme, IconButton } from '@material-ui/core';
import { AltinnButton } from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { renderGenericComponent } from '../../../utils/layout';
import { ITextResource } from 'src/types';
import { ILanguage } from 'altinn-shared/types';

export interface IRepeatingGroupsEditContainer {
  id: string;
  container: ILayoutGroup;
  repeatingGroupDeepCopyComponents: (ILayoutComponent | ILayoutGroup)[][];
  language: ILanguage;
  textResources: ITextResource[];
  layout: ILayout;
  editIndex: number;
  onClickRemove: (groupIndex: number) => void;
  onClickSave: () => void;
  hideSaveButton?: boolean;
  hideDeleteButton?: boolean;
  multiPageIndex?: number;
  setMultiPageIndex?: (index: number) => void;
}

const theme = createTheme(altinnAppTheme);

const useStyles = makeStyles({
  editContainer: {
    display: 'inline-block',
    borderTop: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    borderBottom: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    padding: '24px',
    paddingTop: '12px',
    width: '100%',
    marginBottom: '24px',
    backgroundColor: 'rgba(227, 247, 255, 0.3)',
    '@media (min-width:768px)': {
      padding: '24px',
      border: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    },
    '@media (min-width:993px)': {
      padding: '36px',
    },
  },
  deleteItem: {
    paddingBottom: '0px !important',
  },
  saveItem: {
    paddingTop: '0px !important',
  },
  deleteButton: {
    color: theme.altinnPalette.primary.red,
    fontWeight: 700,
    padding: '8px 12px 6px 6px',
    borderRadius: '0',
    marginRight: '-12px',
    '@media (min-width:768px)': {
      margin: '0',
    },
    '&:hover': {
      background: theme.altinnPalette.primary.red,
      color: theme.altinnPalette.primary.white,
    },
    '&:focus': {
      outlineColor: theme.altinnPalette.primary.red,
    },
    '& .ai': {
      fontSize: '2em',
      marginTop: '-3px',
    },
  },
  hideSaveButton: {
    color: theme.altinnPalette.primary.black,
    borderRadius: '5px',
    padding: '7px 6px 7px 0px',
    marginLeft: '0',
    marginTop: '24px',
    fontWeight: 700,
    '& .hideSaveButton-label': {
      borderBottom: `2px solid transparent`,
    },
    '& .ai': {
      color: theme.altinnPalette.primary.green,
      marginTop: '-2px',
    },
    '&:hover': {
      background: 'none',
      '& .hideSaveButton-label': {
        borderBottom: `2px solid ${theme.altinnPalette.primary.black}`,
      }
    },
    '&:focus': {
      outlineColor: theme.altinnPalette.primary.green,
    },
  }
});

const style = {
  marginBottom: 12,
};

export function RepeatingGroupsEditContainer({
  id,
  container,
  repeatingGroupDeepCopyComponents,
  language,
  textResources,
  layout,
  editIndex,
  onClickRemove,
  onClickSave,
  hideSaveButton,
  hideDeleteButton,
  multiPageIndex,
  setMultiPageIndex,
}: IRepeatingGroupsEditContainer): JSX.Element {
  const classes = useStyles();

  const closeEditContainer = () => {
    onClickSave();
    if (container.edit?.multiPage) {
      setMultiPageIndex(0);
    }
  };

  const removeClicked = () => {
    onClickRemove(editIndex);
    if (container.edit?.multiPage) {
      setMultiPageIndex(0);
    }
  };

  return (
    <div className={classes.editContainer}>
      <Grid container={true} item={true} direction='row' spacing={3}>
        {!hideDeleteButton && (
          <Grid
            item={true}
            container={true}
            direction='column'
            alignItems='flex-end'
            spacing={3}
            className={classes.deleteItem}
          >
            <Grid item={true}>
              <IconButton
                classes={{ root: classes.deleteButton }}
                onClick={removeClicked}
              >
                <i className='ai ai-trash' />
                {getLanguageFromKey('general.delete', language)}
              </IconButton>
            </Grid>
          </Grid>
        )}
        <Grid container={true} alignItems='flex-start' item={true} spacing={3}>
          {repeatingGroupDeepCopyComponents[editIndex]?.map(
            (component: ILayoutComponent) => {
              if (
                container.edit?.multiPage &&
                multiPageIndex > -1 &&
                !container.children.includes(
                  `${multiPageIndex}:${component.id.substring(
                    0,
                    component.id.lastIndexOf('-'),
                  )}`,
                )
              ) {
                return null;
              }
              return renderGenericComponent(component, layout, editIndex);
            },
          )}
        </Grid>
        <Grid item={true} className={classes.saveItem}>
          {container.edit?.multiPage && (
            <div style={style}>
              {multiPageIndex > -1 &&
                container.children.find((childId) =>
                  childId.startsWith(`${multiPageIndex + 1}:`),
                ) && (
                  <AltinnButton
                    btnText={getLanguageFromKey('general.next', language)}
                    secondaryButton={true}
                    onClickFunction={() =>
                      setMultiPageIndex(multiPageIndex + 1)
                    }
                  />
                )}
              {multiPageIndex > 0 &&
                container.children.find((childId) =>
                  childId.startsWith(`${multiPageIndex - 1}:`),
                ) && (
                  <AltinnButton
                    btnText={getLanguageFromKey('general.back', language)}
                    secondaryButton={true}
                    onClickFunction={() =>
                      setMultiPageIndex(multiPageIndex - 1)
                    }
                  />
                )}
            </div>
          )}
          {!hideSaveButton && (
            <IconButton
            classes={{ root: classes.hideSaveButton }}
            id={`add-button-grp-${id}`}
            onClick={closeEditContainer}>
              <i className='ai ai-check-circle' />
              <span className="hideSaveButton-label">{getLanguageFromKey('general.done', language)}</span>
            </IconButton>
          )}
        </Grid>
      </Grid>
    </div>
  );
}
