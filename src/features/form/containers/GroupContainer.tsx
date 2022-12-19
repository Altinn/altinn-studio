import React, { useCallback, useMemo } from 'react';

import { Button, ButtonSize, ButtonVariant } from '@altinn/altinn-design-system';
import { Grid } from '@material-ui/core';
import { Add as AddIcon } from '@navikt/ds-icons';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { ExprDefaultsForGroup } from 'src/features/expressions';
import { useExpressions } from 'src/features/expressions/useExpressions';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { RepeatingGroupTable } from 'src/features/form/containers/RepeatingGroupTable';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { getLanguageFromKey, getTextResourceByKey } from 'src/language/sharedLanguage';
import { RepeatingGroupsLikertContainer } from 'src/layout/Likert/RepeatingGroupsLikertContainer';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { Triggers } from 'src/types';
import { createRepeatingGroupComponents, getRepeatingGroupFilteredIndices } from 'src/utils/formLayout';
import { getHiddenFieldsForGroup } from 'src/utils/layout';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayoutComponent, ILayoutComponentOrGroup } from 'src/layout/layout';
import type { IRuntimeState } from 'src/types';
export interface IGroupProps {
  id: string;
  container: ILayoutGroup;
  components: ILayoutComponentOrGroup[];
  triggers?: Triggers[];
}

const getValidationMethod = (container: ILayoutGroup) => {
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
  const renderComponents: ILayoutComponent[] = JSON.parse(JSON.stringify(components));

  const edit = useExpressions(container.edit, {
    forComponentId: id,
    defaults: ExprDefaultsForGroup.edit,
  });

  const textResourceBindingsResolved = useExpressions(container.textResourceBindings, {
    forComponentId: id,
    defaults: ExprDefaultsForGroup.textResourceBindings,
  });

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
        textResourceBindingsResolved?.add_button
          ? getTextResourceByKey(textResourceBindingsResolved.add_button, textResources)
          : ''
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

  if (edit?.mode === 'likert') {
    return (
      <>
        <RepeatingGroupsLikertContainer
          id={id}
          repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents.map((c) => c[0] as ILayoutComponent)}
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
      <Grid
        container={true}
        justifyContent='flex-end'
      />
      {edit?.mode !== 'showAll' &&
        edit?.addButton !== false &&
        editIndex < 0 &&
        repeatingGroupIndex + 1 < (container.maxCount === undefined ? -99 : container.maxCount) &&
        addButton()}
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
          .map((v, index) => {
            if (filteredIndexList && filteredIndexList.length > 0 && !filteredIndexList.includes(index)) {
              return null;
            }

            return (
              <RepeatingGroupsEditContainer
                key={index}
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
            );
          })}
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
