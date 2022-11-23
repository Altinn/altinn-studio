import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { createTheme, Grid, makeStyles } from '@material-ui/core';
import { Delete as DeleteIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { renderGenericComponent } from 'src/utils/layout';
import type { ILayout, ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';
import type { ITextResource } from 'src/types';

import { AltinnButton } from 'altinn-shared/components';
import altinnAppTheme from 'altinn-shared/theme/altinnAppTheme';
import { getLanguageFromKey, getTextResourceByKey } from 'altinn-shared/utils';
import type { ILanguage } from 'altinn-shared/types';

export interface IRepeatingGroupsEditContainer {
  id: string;
  className?: string;
  container: ILayoutGroup;
  repeatingGroupDeepCopyComponents: (ILayoutComponent | ILayoutGroup)[][];
  language: ILanguage;
  textResources: ITextResource[];
  layout: ILayout | null;
  deleting?: boolean;
  editIndex: number;
  setEditIndex: (index: number, forceValidation?: boolean) => void;
  repeatingGroupIndex: number;
  onClickRemove?: (groupIndex: number) => void;
  hideSaveButton?: boolean;
  hideDeleteButton?: boolean;
  multiPageIndex?: number;
  setMultiPageIndex?: (index: number) => void;
  showSaveAndNextButton?: boolean;
  filteredIndexes?: number[] | null;
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
    backgroundColor: 'rgba(227, 247, 255, 0.5)',
    '@media (min-width:768px)': {
      padding: '24px',
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
    paddingTop: '0px !important',
  },
});

const style = {
  marginBottom: 12,
};

export function RepeatingGroupsEditContainer({
  id,
  className,
  container,
  repeatingGroupDeepCopyComponents,
  language,
  textResources,
  layout,
  deleting,
  editIndex,
  setEditIndex,
  repeatingGroupIndex,
  onClickRemove,
  hideSaveButton,
  hideDeleteButton,
  multiPageIndex,
  setMultiPageIndex,
  showSaveAndNextButton,
  filteredIndexes,
}: IRepeatingGroupsEditContainer): JSX.Element {
  const classes = useStyles();

  let nextIndex: number | null = null;
  if (filteredIndexes) {
    const filteredIndex = filteredIndexes.indexOf(editIndex);
    nextIndex = filteredIndexes.slice(filteredIndex).length > 1 ? filteredIndexes[filteredIndex + 1] : null;
  } else {
    nextIndex = editIndex < repeatingGroupIndex ? editIndex + 1 : null;
  }

  const saveClicked = () => {
    setEditIndex(-1);
  };

  const nextClicked = () => {
    if (nextIndex !== null) {
      setEditIndex && setEditIndex(nextIndex, true);
      if (container.edit?.multiPage) {
        setMultiPageIndex && setMultiPageIndex(0);
      }
    }
  };

  const removeClicked = () => {
    onClickRemove && onClickRemove(editIndex);
    if (container.edit?.multiPage) {
      setMultiPageIndex && setMultiPageIndex(0);
    }
  };

  return (
    <div
      className={cn([classes.editContainer], className)}
      data-testid='group-edit-container'
    >
      <Grid
        container={true}
        item={true}
        direction='row'
        spacing={3}
      >
        {!hideDeleteButton && container.edit?.mode === 'showAll' && (
          <Grid
            item={true}
            container={true}
            direction='column'
            alignItems='flex-end'
            spacing={3}
            className={classes.deleteItem}
          >
            <Grid item={true}>
              <Button
                variant={ButtonVariant.Quiet}
                color={ButtonColor.Danger}
                icon={<DeleteIcon />}
                iconPlacement='right'
                disabled={deleting}
                onClick={removeClicked}
                data-testid='delete-button'
              >
                {getLanguageFromKey('general.delete', language)}
              </Button>
            </Grid>
          </Grid>
        )}
        <Grid
          container={true}
          alignItems='flex-start'
          item={true}
          spacing={3}
        >
          {repeatingGroupDeepCopyComponents[editIndex]?.map((component: ILayoutComponent) => {
            if (
              container.edit?.multiPage &&
              typeof multiPageIndex === 'number' &&
              multiPageIndex > -1 &&
              !container.children.includes(
                `${multiPageIndex}:${component.id.substring(0, component.id.lastIndexOf('-'))}`,
              )
            ) {
              return null;
            }
            return renderGenericComponent({
              component,
              layout,
              index: editIndex,
            });
          })}
        </Grid>
        <Grid item={true}>
          {container.edit?.multiPage && (
            <div style={style}>
              {typeof multiPageIndex === 'number' &&
                multiPageIndex > -1 &&
                container.children.find((childId) => childId.startsWith(`${multiPageIndex + 1}:`)) && (
                  <AltinnButton
                    btnText={getLanguageFromKey('general.next', language)}
                    secondaryButton={true}
                    onClickFunction={() => setMultiPageIndex && setMultiPageIndex(multiPageIndex + 1)}
                  />
                )}
              {typeof multiPageIndex === 'number' &&
                multiPageIndex > 0 &&
                container.children.find((childId) => childId.startsWith(`${multiPageIndex - 1}:`)) && (
                  <AltinnButton
                    btnText={getLanguageFromKey('general.back', language)}
                    secondaryButton={true}
                    onClickFunction={() => setMultiPageIndex && setMultiPageIndex(multiPageIndex - 1)}
                  />
                )}
            </div>
          )}
          <Grid
            container={true}
            direction='row'
            spacing={2}
          >
            {showSaveAndNextButton && nextIndex !== null && (
              <Grid item={true}>
                <Button
                  id={`next-button-grp-${id}`}
                  onClick={nextClicked}
                  variant={ButtonVariant.Filled}
                  color={ButtonColor.Primary}
                >
                  {container.textResourceBindings?.save_and_next_button
                    ? getTextResourceByKey(container.textResourceBindings.save_and_next_button, textResources)
                    : getLanguageFromKey('general.save_and_next', language)}
                </Button>
              </Grid>
            )}
            {(!hideSaveButton || (showSaveAndNextButton && nextIndex === null)) && (
              <Grid item={true}>
                <Button
                  id={`add-button-grp-${id}`}
                  onClick={saveClicked}
                  variant={ButtonVariant.Outline}
                  color={ButtonColor.Primary}
                >
                  {container.textResourceBindings?.save_button
                    ? getTextResourceByKey(container.textResourceBindings.save_button, textResources)
                    : getLanguageFromKey('general.save_and_close', language)}
                </Button>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
}
