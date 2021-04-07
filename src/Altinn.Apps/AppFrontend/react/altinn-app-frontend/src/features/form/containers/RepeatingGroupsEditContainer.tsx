/* eslint-disable no-undef */
import React from 'react';
import { Grid, makeStyles, createMuiTheme, IconButton } from '@material-ui/core';
import { AltinnButton } from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { renderGenericComponent } from '../../../utils/layout';
import { ITextResource } from '../../../types';

export interface IRepeatingGroupsEditContainer {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  hiddenFields: string[];
  repeatingGroupIndex: number;
  language: any;
  textResources: ITextResource[];
  layout: ILayout;
  editIndex: number;
  setEditIndex: (index: number) => void;
  onClickRemove: (groupIndex: number) => void;
  hideSaveButton?: boolean;
  hideDeleteButton?: boolean;
}

const theme = createMuiTheme(altinnAppTheme);

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

export function RepeatingGroupsEditContainer({
  id,
  container,
  components,
  hiddenFields,
  repeatingGroupIndex,
  language,
  textResources,
  layout,
  editIndex,
  setEditIndex,
  onClickRemove,
  hideSaveButton,
  hideDeleteButton,
}: IRepeatingGroupsEditContainer): JSX.Element {
  const classes = useStyles();
  const renderComponents: ILayoutComponent[] = JSON.parse(JSON.stringify(components));

  const repeatingGroupDeepCopyComponents = createRepeatingGroupComponents(
    container,
    renderComponents,
    repeatingGroupIndex,
    textResources,
    hiddenFields,
  );

  return (
    <div className={classes.editContainer}>
      <Grid
        container={true}
        item={true}
        direction='row'
        spacing={3}
      >
        {!hideDeleteButton &&
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
              onClick={() => onClickRemove(editIndex)}
            >
              {getLanguageFromKey('general.delete', language)}
              <i className='ai ai-trash'/>
            </IconButton>
          </Grid>
        </Grid>}
        <Grid
          container={true}
          alignItems='flex-start'
          item={true}
          spacing={3}
        >
          { repeatingGroupDeepCopyComponents[editIndex]?.map((component: ILayoutComponent) => {
            return renderGenericComponent(component, layout, editIndex);
          }) }
        </Grid>
        <Grid
          item={true}
          spacing={3}
          className={classes.saveItem}
        >
          { !hideSaveButton &&
          <AltinnButton
            btnText={getLanguageFromKey('general.save', language)}
            onClickFunction={() => setEditIndex(-1)}
            id={`add-button-grp-${id}`}
          />}
        </Grid>
      </Grid>
    </div>
  );
}
