import React from 'react';

import { Button, ButtonVariant } from '@altinn/altinn-design-system';
import { createTheme, Grid, makeStyles } from '@material-ui/core';

import { renderGenericComponent } from 'src/utils/layout';
import type {
  ILayout,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';
import type { ITextResource } from 'src/types';

import { AltinnButton } from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import type { ILanguage } from 'altinn-shared/types';

export interface IRepeatingGroupsEditContainer {
  id: string;
  container: ILayoutGroup;
  repeatingGroupDeepCopyComponents: (ILayoutComponent | ILayoutGroup)[][];
  language: ILanguage;
  textResources: ITextResource[];
  layout: ILayout;
  editIndex: number;
  onClickSave: () => void;
  hideSaveButton?: boolean;
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
    '& &': {
      padding: '24px',
      border: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
      backgroundColor: theme.altinnPalette.primary.blueLighter,
    },
  },
  deleteItem: {
    paddingBottom: '0px !important',
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
  onClickSave,
  hideSaveButton,
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

  return (
    <div className={classes.editContainer}>
      <Grid
        container={true}
        item={true}
        direction='row'
        spacing={3}
      >
        <Grid
          container={true}
          alignItems='flex-start'
          item={true}
          spacing={3}
        >
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
        <Grid item={true}>
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
            <Button
              id={`add-button-grp-${id}`}
              onClick={closeEditContainer}
              variant={ButtonVariant.Secondary}
            >
              {container.textResourceBindings?.save_button
                ? getTextResourceByKey(
                    container.textResourceBindings.save_button,
                    textResources,
                  )
                : getLanguageFromKey('general.save_and_close', language)}
            </Button>
          )}
        </Grid>
      </Grid>
    </div>
  );
}
