import React, { useCallback, useEffect } from 'react';

import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { Add as AddIcon } from '@navikt/ds-icons';

import { AltinnLoader } from 'src/components/AltinnLoader';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/components/form/FullWidthWrapper';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import { RepeatingGroupsEditContainer } from 'src/layout/Group/RepeatingGroupsEditContainer';
import { RepeatingGroupTable } from 'src/layout/Group/RepeatingGroupTable';
import { RepeatingGroupsLikertContainer } from 'src/layout/Likert/RepeatingGroupsLikertContainer';
import { Triggers } from 'src/types';
import { getRepeatingGroupFilteredIndices } from 'src/utils/formLayout';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { IRuntimeState } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
export interface IGroupProps {
  id: string;
}

const getValidationMethod = (node: LayoutNode | undefined) => {
  // Validation for whole group takes precedent over single-row validation if both are present.
  const triggers = node?.item.triggers;
  if (triggers && triggers.includes(Triggers.Validation)) {
    return Triggers.Validation;
  }
  if (triggers && triggers.includes(Triggers.ValidateRow)) {
    return Triggers.ValidateRow;
  }
};

export function GroupContainer({ id }: IGroupProps): JSX.Element | null {
  const dispatch = useAppDispatch();
  const node = useResolvedNode(id);
  const resolvedTextBindings = node?.item.textResourceBindings;
  const edit = node?.isType('Group') ? node.item.edit : undefined;
  const isLoading = useAppSelector(
    (state) => state.formLayout.uiConfig.repeatingGroups && state.formLayout.uiConfig.repeatingGroups[id]?.isLoading,
  );

  const editIndex = useAppSelector(
    (state: IRuntimeState) =>
      (state.formLayout.uiConfig.repeatingGroups && state.formLayout.uiConfig.repeatingGroups[id]?.editIndex) ?? -1,
  );
  const deletingIndexes = useAppSelector(
    (state: IRuntimeState) =>
      (state.formLayout.uiConfig.repeatingGroups && state.formLayout.uiConfig.repeatingGroups[id]?.deletingIndex) ?? [],
  );
  const multiPageIndex = useAppSelector(
    (state: IRuntimeState) =>
      (state.formLayout.uiConfig.repeatingGroups && state.formLayout.uiConfig.repeatingGroups[id]?.multiPageIndex) ??
      -1,
  );

  const language = useAppSelector((state) => state.language.language);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const formData = useAppSelector((state) => state.formData.formData);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const repeatingGroupIndex = repeatingGroups && repeatingGroups[id] ? repeatingGroups[id].index : -1;

  const filteredIndexList = React.useMemo(
    () => getRepeatingGroupFilteredIndices(formData, edit?.filter),
    [formData, edit],
  );

  const setMultiPageIndex = useCallback(
    (index: number) => {
      dispatch(
        FormLayoutActions.updateRepeatingGroupsMultiPageIndex({
          group: id,
          index,
        }),
      );
    },
    [dispatch, id],
  );

  const AddButton = (): JSX.Element => (
    <Button
      id={`add-button-${id}`}
      onClick={onClickAdd}
      onKeyUp={onKeypressAdd}
      variant={ButtonVariant.Outline}
      size={ButtonSize.Medium}
      icon={<AddIcon aria-hidden='true' />}
      iconPlacement='left'
      fullWidth
      disabled={isLoading || false}
    >
      {isLoading && (
        <AltinnLoader
          style={{ position: 'absolute' }}
          srContent={`${getLanguageFromKey('general.add_new', language ?? {})} ${
            resolvedTextBindings?.add_button ? getTextResourceByKey(resolvedTextBindings.add_button, textResources) : ''
          }`}
        />
      )}
      {`${getLanguageFromKey('general.add_new', language ?? {})} ${
        resolvedTextBindings?.add_button ? getTextResourceByKey(resolvedTextBindings.add_button, textResources) : ''
      }`}
    </Button>
  );

  const onClickAdd = useCallback(() => {
    if (!edit?.alwaysShowAddButton || edit?.mode === 'showAll') {
      dispatch(FormLayoutActions.updateRepeatingGroups({ layoutElementId: id }));
    }
    if (edit?.mode !== 'showAll') {
      dispatch(
        FormLayoutActions.updateRepeatingGroupsEditIndex({
          group: id,
          index: repeatingGroupIndex + 1,
          validate: edit?.alwaysShowAddButton && repeatingGroupIndex > -1 ? getValidationMethod(node) : undefined,
          shouldAddRow: !!edit?.alwaysShowAddButton,
        }),
      );
      setMultiPageIndex(0);
    }
  }, [dispatch, id, edit?.mode, edit?.alwaysShowAddButton, node, repeatingGroupIndex, setMultiPageIndex]);

  useEffect(() => {
    if (edit?.openByDefault && repeatingGroupIndex === -1) {
      onClickAdd();
    }
  }, [edit?.openByDefault, onClickAdd, repeatingGroupIndex]);

  useEffect(() => {
    if (edit?.multiPage && multiPageIndex < 0) {
      setMultiPageIndex(0);
    }
  }, [edit?.multiPage, multiPageIndex, setMultiPageIndex]);

  const onKeypressAdd = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    const allowedKeys = ['enter', ' ', 'spacebar'];
    if (allowedKeys.includes(event.key.toLowerCase())) {
      onClickAdd();
    }
  };

  const onClickRemove = (groupIndex: number): void => {
    dispatch(
      FormLayoutActions.updateRepeatingGroups({
        layoutElementId: id,
        remove: true,
        index: groupIndex,
      }),
    );
  };

  const setEditIndex = (index: number, forceValidation?: boolean): void => {
    dispatch(
      FormLayoutActions.updateRepeatingGroupsEditIndex({
        group: id,
        index,
        validate: index === -1 || forceValidation ? getValidationMethod(node) : undefined,
      }),
    );
    if (edit?.multiPage && index > -1) {
      setMultiPageIndex(0);
    }
  };

  if (!repeatingGroups || !node || node.isHidden() || node.item.type !== 'Group') {
    return null;
  }

  const isNested = typeof node?.item.baseComponentId === 'string';

  if (edit?.mode === 'likert') {
    return (
      <>
        <RepeatingGroupsLikertContainer id={id} />
      </>
    );
  }

  const displayBtn =
    edit?.addButton !== false &&
    'maxCount' in node.item &&
    repeatingGroupIndex + 1 < (node.item.maxCount === undefined ? -99 : node.item.maxCount) &&
    (edit?.mode === 'showAll' || editIndex < 0 || edit?.alwaysShowAddButton === true);

  return (
    <Grid
      container={true}
      item={true}
      data-componentid={node.item.baseComponentId ?? node.item.id}
    >
      {(!edit?.mode || edit?.mode === 'showTable' || (edit?.mode === 'hideTable' && editIndex < 0)) && (
        <RepeatingGroupTable
          editIndex={editIndex}
          id={id}
          repeatingGroupIndex={repeatingGroupIndex}
          deleting={deletingIndexes.includes(repeatingGroupIndex)}
          setEditIndex={setEditIndex}
          onClickRemove={onClickRemove}
          setMultiPageIndex={setMultiPageIndex}
          multiPageIndex={multiPageIndex}
          filteredIndexes={filteredIndexList}
        />
      )}
      {edit?.mode !== 'showAll' && displayBtn && <AddButton />}
      <ConditionalWrapper
        condition={!isNested}
        wrapper={(children) => <FullWidthWrapper>{children}</FullWidthWrapper>}
      >
        <>
          {editIndex >= 0 && edit?.mode === 'hideTable' && (
            <RepeatingGroupsEditContainer
              editIndex={editIndex}
              setEditIndex={setEditIndex}
              repeatingGroupIndex={repeatingGroupIndex}
              id={id}
              multiPageIndex={multiPageIndex}
              setMultiPageIndex={setMultiPageIndex}
              filteredIndexes={filteredIndexList}
            />
          )}
          {edit?.mode === 'showAll' &&
            // Generate array of length repeatingGroupIndex and iterate over indexes
            Array(repeatingGroupIndex + 1)
              .fill(0)
              .map((_, index) => {
                if (filteredIndexList && filteredIndexList.length > 0 && !filteredIndexList.includes(index)) {
                  return null;
                }

                return (
                  <div
                    key={index}
                    style={{ width: '100%', marginBottom: !isNested && index == repeatingGroupIndex ? 15 : 0 }}
                  >
                    <RepeatingGroupsEditContainer
                      editIndex={index}
                      repeatingGroupIndex={repeatingGroupIndex}
                      id={id}
                      deleting={deletingIndexes.includes(index)}
                      setEditIndex={setEditIndex}
                      onClickRemove={onClickRemove}
                      forceHideSaveButton={true}
                    />
                  </div>
                );
              })}
        </>
      </ConditionalWrapper>
      {edit?.mode === 'showAll' && displayBtn && <AddButton />}
      <Grid
        item={true}
        xs={12}
      >
        {node.getValidations('group') && renderValidationMessagesForComponent(node.getValidations('group'), id)}
      </Grid>
    </Grid>
  );
}
