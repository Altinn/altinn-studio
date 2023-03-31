import React, { useEffect, useRef } from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { Back, Delete as DeleteIcon, Next } from '@navikt/ds-icons';
import cn from 'classnames';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import classes from 'src/features/form/containers/RepeatingGroup.module.css';
import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import type { ExprResolved } from 'src/features/expressions/types';
import type { IGroupEditProperties } from 'src/layout/Group/types';
import type { ILanguage } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/hierarchy';
import type { AnyItem, HRepGroup, HRepGroupChild, HRepGroupRow } from 'src/utils/layout/hierarchy.types';

type FocusableHTMLElement = HTMLElement &
  HTMLButtonElement &
  HTMLInputElement &
  HTMLSelectElement &
  HTMLTextAreaElement &
  HTMLAnchorElement;

export interface IRepeatingGroupsEditContainer {
  id: string;
  className?: string;
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

export function RepeatingGroupsEditContainer({
  id,
  editIndex,
  ...props
}: IRepeatingGroupsEditContainer): JSX.Element | null {
  const language = useAppSelector((state) => state.language.language);
  const node = useResolvedNode(id);
  const group = node?.item;

  if (!group || !node || group.type !== 'Group' || !('rows' in group)) {
    return null;
  }

  const row = group.rows[editIndex];

  if (!row || !language) {
    return null;
  }

  const shouldHideRow = node.isRepGroup() && node.item.rows[editIndex]?.groupExpressions?.hiddenRow;
  if (shouldHideRow) {
    return null;
  }

  return (
    <RepeatingGroupsEditContainerInternal
      id={id}
      editIndex={editIndex}
      group={group}
      row={row}
      node={node}
      language={language}
      {...props}
    />
  );
}

function RepeatingGroupsEditContainerInternal({
  id,
  className,
  deleting,
  editIndex,
  setEditIndex,
  repeatingGroupIndex,
  onClickRemove,
  forceHideSaveButton,
  multiPageIndex,
  setMultiPageIndex,
  filteredIndexes,
  group,
  row,
  node,
  language,
}: IRepeatingGroupsEditContainer & {
  group: HRepGroup;
  row: HRepGroupRow;
  node: LayoutNode<AnyItem>;
  language: ILanguage;
}): JSX.Element | null {
  const textResources = useAppSelector((state) => state.textResources.resources);
  const textsForRow = row?.groupExpressions?.textResourceBindings;
  const editForRow = row?.groupExpressions?.edit;
  const editForGroup = group.edit;
  const rowItems = row.items;

  const gridRef = useRef<HTMLDivElement | null>(null);
  const prevGroupRowItems = useRef<HRepGroupChild[] | undefined>(undefined);

  useEffect((): void => {
    if (!gridRef.current || JSON.stringify(prevGroupRowItems.current) === JSON.stringify(rowItems)) {
      return;
    }
    prevGroupRowItems.current = rowItems;

    const isFocusable = (element: FocusableHTMLElement): boolean => {
      const tagName = element.tagName.toLowerCase();
      const focusableElements = ['a', 'input', 'select', 'textarea', 'button'];

      if (element.tabIndex < 0) {
        return false;
      }

      const isAvailable =
        element.type !== 'hidden' || !element.disabled || (element.type.toLowerCase() === 'a' && !!element.href);

      return focusableElements.includes(tagName) && isAvailable;
    };

    const findFirstFocusableElement = (container: HTMLElement): FocusableHTMLElement | undefined =>
      Array.from(container.getElementsByTagName('*')).find(isFocusable) as FocusableHTMLElement;

    const firstFocusableChild = findFirstFocusableElement(gridRef.current);

    if (firstFocusableChild) {
      firstFocusableChild.focus();
    }
    /*
     * Depend on rowItems because generic components are rendered when rowItems change.
     */
  }, [editIndex, rowItems]);

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

  const getGenericComponentsToRender = (): (JSX.Element | null)[] =>
    rowItems.map((component): JSX.Element | null => {
      const isMultiPage =
        edit?.multiPage &&
        typeof multiPageIndex === 'number' &&
        multiPageIndex > -1 &&
        component.multiPageIndex !== multiPageIndex;

      if (isMultiPage) {
        return null;
      }

      const nodeToRender = node.top.findById(component.id);
      return nodeToRender ? (
        <GenericComponent
          node={nodeToRender}
          key={nodeToRender.item.id}
        />
      ) : null;
    });

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
          ref={gridRef}
        >
          {getGenericComponentsToRender()}
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
                rowItems.filter((n) => n.multiPageIndex === multiPageIndex - 1).length > 0 && (
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
                rowItems.filter((n) => n.multiPageIndex === multiPageIndex + 1).length > 0 && (
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
