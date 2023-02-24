import React, { useCallback, useMemo } from 'react';

import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';
import { Add as AddIcon } from '@navikt/ds-icons';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/features/form/components/FullWidthWrapper';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { RepeatingGroupTable } from 'src/features/form/containers/RepeatingGroupTable';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import { RepeatingGroupsLikertContainer } from 'src/layout/Likert/RepeatingGroupsLikertContainer';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { Triggers } from 'src/types';
import { createRepeatingGroupComponents, getRepeatingGroupFilteredIndices } from 'src/utils/formLayout';
import { getHiddenFieldsForGroup } from 'src/utils/layout';
import { useResolvedNode } from 'src/utils/layout/ExprContext';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { ExprResolved, ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ComponentInGroup, ILayoutComponent } from 'src/layout/layout';
import type { IRuntimeState } from 'src/types';

export interface IGroupProps {
  id: string;
  container: ExprUnresolved<ILayoutGroup>;
  components: ExprUnresolved<ComponentInGroup>[];
  triggers?: Triggers[];
}

const getValidationMethod = (container: ExprResolved<ILayoutGroup> | ExprUnresolved<ILayoutGroup>) => {
  // Validation for whole group takes precedent over single-row validation if both are present.
  const triggers = container.triggers;
  if (triggers && triggers.includes(Triggers.Validation)) {
    return Triggers.Validation;
  }
  if (triggers && triggers.includes(Triggers.ValidateRow)) {
    return Triggers.ValidateRow;
  }
};

export function GroupContainer({ id, container, components }: IGroupProps): JSX.Element | null {
  const dispatch = useAppDispatch();
  const renderComponents: ExprUnresolved<ILayoutComponent>[] = JSON.parse(JSON.stringify(components));

  const node = useResolvedNode(id);
  const resolvedTextBindings = node?.item.textResourceBindings;
  const edit = node?.item.type === 'Group' ? node.item.edit : undefined;

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

  const attachments = useAppSelector((state: IRuntimeState) => state.attachments.attachments);

  const validations = useAppSelector((state) => state.formValidations.validations);
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const language = useAppSelector((state) => state.language.language);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const hiddenFields = useAppSelector((state) =>
    getHiddenFieldsForGroup(state.formLayout.uiConfig.hiddenFields, components),
  );
  const GetHiddenSelector = makeGetHidden();
  const hidden = useAppSelector((state) => GetHiddenSelector(state, { id }));
  const formData = useAppSelector((state) => state.formData.formData);
  const layout = useAppSelector(
    (state) => state.formLayout.layouts && state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );
  const options = useAppSelector((state) => state.optionState.options);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const repeatingGroupIndex = repeatingGroups && repeatingGroups[id] ? repeatingGroups[id].index : -1;
  const repeatingGroupDeepCopyComponents = useMemo(
    () => createRepeatingGroupComponents(container, renderComponents, repeatingGroupIndex, textResources, hiddenFields),
    [container, renderComponents, repeatingGroupIndex, textResources, hiddenFields],
  );

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

  const addButton = () => (
    <Button
      id={`add-button-${id}`}
      onClick={onClickAdd}
      onKeyUp={onKeypressAdd}
      variant={ButtonVariant.Outline}
      size={ButtonSize.Medium}
      icon={<AddIcon aria-hidden='true' />}
      iconPlacement='left'
      fullWidth
    >
      {`${getLanguageFromKey('general.add_new', language ?? {})} ${
        resolvedTextBindings?.add_button ? getTextResourceByKey(resolvedTextBindings.add_button, textResources) : ''
      }`}
    </Button>
  );

  const onClickAdd = useCallback(() => {
    dispatch(FormLayoutActions.updateRepeatingGroups({ layoutElementId: id }));
    if (edit?.mode !== 'showAll') {
      dispatch(
        FormLayoutActions.updateRepeatingGroupsEditIndex({
          group: id,
          index: repeatingGroupIndex + 1,
        }),
      );
      setMultiPageIndex(0);
    }
  }, [dispatch, id, edit?.mode, repeatingGroupIndex, setMultiPageIndex]);

  React.useEffect(() => {
    const { edit } = container;
    if (!edit) {
      return;
    }

    if (edit.openByDefault && repeatingGroupIndex === -1) {
      onClickAdd();
    }
  }, [container, onClickAdd, repeatingGroupIndex]);

  React.useEffect(() => {
    if (edit?.multiPage && multiPageIndex < 0) {
      setMultiPageIndex(0);
    }
  }, [edit?.multiPage, multiPageIndex, setMultiPageIndex]);

  const onKeypressAdd = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      onClickAdd();
    }
  };

  const onClickRemove = (groupIndex: number) => {
    dispatch(
      FormLayoutActions.updateRepeatingGroups({
        layoutElementId: id,
        remove: true,
        index: groupIndex,
      }),
    );
  };

  const setEditIndex = (index: number, forceValidation?: boolean) => {
    dispatch(
      FormLayoutActions.updateRepeatingGroupsEditIndex({
        group: id,
        index,
        validate: index === -1 || forceValidation ? getValidationMethod(container) : undefined,
      }),
    );
    if (edit?.multiPage && index > -1) {
      setMultiPageIndex(0);
    }
  };

  if (hidden || !language || !layout || !repeatingGroups) {
    return null;
  }

  const isNested = typeof container.baseComponentId === 'string';

  if (edit?.mode === 'likert') {
    return (
      <>
        <RepeatingGroupsLikertContainer
          id={id}
          repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents.map((c) => c[0])}
          textResources={textResources}
          container={container}
        />
      </>
    );
  }

  return (
    <Grid
      container={true}
      item={true}
    >
      {(!edit?.mode || edit?.mode === 'showTable' || (edit?.mode === 'hideTable' && editIndex < 0)) && (
        <RepeatingGroupTable
          components={components}
          attachments={attachments}
          container={container}
          currentView={currentView}
          editIndex={editIndex}
          formData={formData}
          hiddenFields={hiddenFields}
          id={id}
          language={language}
          layout={layout}
          options={options}
          repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents}
          repeatingGroupIndex={repeatingGroupIndex}
          repeatingGroups={repeatingGroups}
          deleting={deletingIndexes.includes(repeatingGroupIndex)}
          setEditIndex={setEditIndex}
          onClickRemove={onClickRemove}
          setMultiPageIndex={setMultiPageIndex}
          multiPageIndex={multiPageIndex}
          textResources={textResources}
          validations={validations}
          filteredIndexes={filteredIndexList}
        />
      )}
      {edit?.mode !== 'showAll' &&
        edit?.addButton !== false &&
        editIndex < 0 &&
        repeatingGroupIndex + 1 < (container.maxCount === undefined ? -99 : container.maxCount) &&
        addButton()}
      <ConditionalWrapper
        condition={!isNested}
        wrapper={(children) => <FullWidthWrapper>{children}</FullWidthWrapper>}
      >
        <>
          {editIndex >= 0 && edit?.mode === 'hideTable' && (
            <RepeatingGroupsEditContainer
              container={container}
              editIndex={editIndex}
              setEditIndex={setEditIndex}
              repeatingGroupIndex={repeatingGroupIndex}
              id={id}
              language={language}
              textResources={textResources}
              layout={layout}
              repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents}
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
                      container={container}
                      id={id}
                      language={language}
                      deleting={deletingIndexes.includes(index)}
                      textResources={textResources}
                      layout={layout}
                      setEditIndex={setEditIndex}
                      onClickRemove={onClickRemove}
                      repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents}
                      forceHideSaveButton={true}
                    />
                  </div>
                );
              })}
        </>
      </ConditionalWrapper>
      {edit?.mode === 'showAll' &&
        edit?.addButton !== false &&
        repeatingGroupIndex + 1 < (container.maxCount === undefined ? -99 : container.maxCount) &&
        addButton()}
      <Grid
        item={true}
        xs={12}
      >
        {validations &&
          validations[currentView] &&
          validations[currentView][id] &&
          renderValidationMessagesForComponent(validations[currentView][id].group, container.id)}
      </Grid>
    </Grid>
  );
}
