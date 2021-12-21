import React from 'react';
import { Grid, makeStyles, createTheme, IconButton } from '@material-ui/core';
import { AltinnButton } from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { renderGenericComponent } from '../../../utils/layout';
import { ITextResource } from 'src/types';

export interface IRepeatingGroupsEditContainer {
  id: string;
  container: ILayoutGroup;
  repeatingGroupDeepCopyComponents: (ILayoutComponent | ILayoutGroup)[][];
  language: any;
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
    border: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    padding: '12px',
    width: '100%',
    marginBottom: '24px',
  },
  deleteItem: {
    paddingBottom: '0px !important',
  },
  saveItem: {
    paddingTop: '0px !important',
  },
  deleteButton: {
    padding: '0px',
    color: 'black',
  },
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
                {getLanguageFromKey('general.delete', language)}
                <i className='ai ai-trash' />
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
            <AltinnButton
              btnText={
                container.textResourceBindings?.save_button ?
                getTextResourceByKey(container.textResourceBindings.save_button, textResources) :
                getLanguageFromKey('general.save', language)
              }
              onClickFunction={closeEditContainer}
              id={`add-button-grp-${id}`}
            />
          )}
        </Grid>
      </Grid>
    </div>
  );
}
