import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Grid, makeStyles } from '@material-ui/core';
import { Back, Delete as DeleteIcon, Next } from '@navikt/ds-icons';
import cn from 'classnames';

import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import { AltinnStudioTheme } from 'src/theme/altinnStudioTheme';
import { renderGenericComponent } from 'src/utils/layout';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGroupEditProperties, ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup, ILayout } from 'src/layout/layout';
import type { ITextResource } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export interface IRepeatingGroupsEditContainer {
  id: string;
  className?: string;
  container: ILayoutGroup;
  repeatingGroupDeepCopyComponents: ComponentInGroup[][];
  language: ILanguage;
  textResources: ITextResource[];
  layout: ILayout | null;
  deleting?: boolean;
  editIndex: number;
  setEditIndex: (index: number, forceValidation?: boolean) => void;
  repeatingGroupIndex: number;
  onClickRemove?: (groupIndex: number) => void;
  forceHideSaveButton?: boolean;
  multiPageIndex?: number;
  setMultiPageIndex?: (index: number) => void;
  filteredIndexes?: number[] | null;
}

const useStyles = makeStyles({
  editContainer: {
    backgroundColor: '#f1fbff',
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
    backgroundColor: '#f1fbff',
    width: '100%',
    display: 'inline-block',
    padding: '12px 24px',
  },
  hideTable: {
    borderTop: `2px dotted ${AltinnStudioTheme.altinnPalette.primary.blueMedium}`,
    borderBottom: `2px dotted ${AltinnStudioTheme.altinnPalette.primary.blueMedium}`,
    marginBottom: '-2px',
  },
  nestedHideTable: {
    borderRight: `2px dotted ${AltinnStudioTheme.altinnPalette.primary.blueMedium}`,
    borderLeft: `2px dotted ${AltinnStudioTheme.altinnPalette.primary.blueMedium}`,
  },
});

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
  forceHideSaveButton,
  multiPageIndex,
  setMultiPageIndex,
  filteredIndexes,
}: IRepeatingGroupsEditContainer): JSX.Element | null {
  const classes = useStyles();
  const group = useResolvedNode(container)?.item;
  if (!group) {
    return null;
  }

  const textsForRow = 'rows' in group ? group.rows[editIndex]?.groupExpressions?.textResourceBindings : undefined;
  const editForRow = 'rows' in group ? group.rows[editIndex]?.groupExpressions?.edit : undefined;
  const editForGroup = group.type === 'Group' ? group.edit : undefined;

  const texts = {
    ...group.textResourceBindings,
    ...textsForRow,
  };

  const edit = {
    ...editForGroup,
    ...editForRow,
  } as ExprResolved<IGroupEditProperties>;

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
      if (edit.multiPage) {
        setMultiPageIndex && setMultiPageIndex(0);
      }
    }
  };

  const removeClicked = () => {
    onClickRemove && onClickRemove(editIndex);
    if (edit.multiPage) {
      setMultiPageIndex && setMultiPageIndex(0);
    }
  };

  const isNested = typeof group.baseComponentId === 'string';
  const saveButtonVisible =
    !forceHideSaveButton && (edit?.saveButton !== false || (edit.saveAndNextButton === true && nextIndex === null));
  const saveAndNextButtonVisible = !forceHideSaveButton && edit.saveAndNextButton === true && nextIndex !== null;

  const hideTable = edit.mode === 'hideTable' || edit.mode === 'showAll';

  return (
    <div
      id={`group-edit-container-${id}-${editIndex}`}
      className={cn(
        isNested ? classes.nestedEditContainer : classes.editContainer,
        { [classes.hideTable]: hideTable, [classes.nestedHideTable]: hideTable && isNested },
        className,
      )}
      style={{ marginBottom: isNested && edit?.mode === 'showAll' ? 15 : undefined }}
      data-testid='group-edit-container'
    >
      {edit?.deleteButton !== false && edit?.mode === 'showAll' && (
        <Grid
          item={true}
          container={true}
          direction='column'
          alignItems='flex-end'
          spacing={3}
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
          {repeatingGroupDeepCopyComponents[editIndex]?.map((component) => {
            if (
              edit?.multiPage &&
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
          {edit?.multiPage && (
            <Grid
              container={true}
              direction='row'
              spacing={1}
              style={{ marginBottom: 12 }}
            >
              {typeof multiPageIndex === 'number' &&
                multiPageIndex > 0 &&
                container.children.find((childId) => childId.startsWith(`${multiPageIndex - 1}:`)) && (
                  <Grid item={true}>
                    <Button
                      icon={<Back aria-hidden='true' />}
                      variant={ButtonVariant.Quiet}
                      color={ButtonColor.Secondary}
                      onClick={() => setMultiPageIndex && setMultiPageIndex(multiPageIndex - 1)}
                    >
                      {getLanguageFromKey('general.back', language)}
                    </Button>
                  </Grid>
                )}
              {typeof multiPageIndex === 'number' &&
                multiPageIndex > -1 &&
                container.children.find((childId) => childId.startsWith(`${multiPageIndex + 1}:`)) && (
                  <Grid item={true}>
                    <Button
                      icon={<Next aria-hidden='true' />}
                      iconPlacement='right'
                      variant={ButtonVariant.Quiet}
                      color={ButtonColor.Secondary}
                      onClick={() => setMultiPageIndex && setMultiPageIndex(multiPageIndex + 1)}
                    >
                      {getLanguageFromKey('general.next', language)}
                    </Button>
                  </Grid>
                )}
            </Grid>
          )}
          <Grid
            container={true}
            direction='row'
            spacing={1}
          >
            {saveAndNextButtonVisible && (
              <Grid item={true}>
                <Button
                  id={`next-button-grp-${id}`}
                  onClick={nextClicked}
                  variant={ButtonVariant.Filled}
                  color={ButtonColor.Primary}
                >
                  {texts?.save_and_next_button
                    ? getTextResourceByKey(texts.save_and_next_button, textResources)
                    : getLanguageFromKey('general.save_and_next', language)}
                </Button>
              </Grid>
            )}
            {saveButtonVisible && (
              <Grid item={true}>
                <Button
                  id={`add-button-grp-${id}`}
                  onClick={saveClicked}
                  variant={saveAndNextButtonVisible ? ButtonVariant.Outline : ButtonVariant.Filled}
                  color={ButtonColor.Primary}
                >
                  {texts?.save_button
                    ? getTextResourceByKey(texts.save_button, textResources)
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
