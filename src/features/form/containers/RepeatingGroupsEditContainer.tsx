import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { Grid, makeStyles } from '@material-ui/core';
import { Delete as DeleteIcon } from '@navikt/ds-icons';
import cn from 'classnames';

import { AltinnButton } from 'src/components/shared';
import { ExprDefaultsForGroup } from 'src/features/expressions';
import { useExpressions } from 'src/features/expressions/useExpressions';
import theme from 'src/theme/altinnStudioTheme';
import { renderGenericComponent } from 'src/utils/layout';
import { getLanguageFromKey, getTextResourceByKey } from 'src/utils/sharedUtils';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout, ILayoutComponent } from 'src/layout/layout';
import type { ITextResource } from 'src/types';
import type { ILanguage } from 'src/types/shared';

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

const useStyles = makeStyles({
  editContainer: {
    width: '100%',
    display: 'inline-block',
    padding: '12px 24px',
    '@media (min-width: 768px)': {
      padding: '24px 84px',
    },
    '@media (min-width: 992px)': {
      padding: '36px 96px',
    },
  },
  nestedEditContainer: {
    width: '100%',
    display: 'inline-block',
    padding: '12px 24px',
  },
  deleteItem: {
    paddingBottom: '0px !important',
    paddingTop: '0px !important',
  },
  showAll: {
    backgroundColor: '#f1fbff',
    borderTop: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    borderBottom: `2px dotted ${theme.altinnPalette.primary.blueMedium}`,
    marginBottom: '-2px',
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

  const textResourceBindings = useExpressions(container.textResourceBindings, {
    forComponentId: container.id,
    defaults: ExprDefaultsForGroup.textResourceBindings,
  });

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

  const isNested = typeof container.baseComponentId === 'string';

  return (
    <div
      className={cn(
        isNested ? classes.nestedEditContainer : classes.editContainer,
        { [classes.showAll]: container.edit?.mode === 'showAll' },
        className,
      )}
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
                  {textResourceBindings?.save_and_next_button
                    ? getTextResourceByKey(textResourceBindings.save_and_next_button, textResources)
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
                  {textResourceBindings?.save_button
                    ? getTextResourceByKey(textResourceBindings.save_button, textResources)
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
