import React, { useCallback, useMemo } from 'react';
import { Grid } from '@material-ui/core';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { repeatingGroupHasValidations } from 'src/utils/validation';
import ErrorPaper from 'src/components/message/ErrorPaper';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { getHiddenFieldsForGroup } from 'src/utils/layout';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { ILayoutComponent, ILayoutGroup } from '../layout';
import { FormLayoutActions } from '../layout/formLayoutSlice';
import { Triggers } from '../../../types';
import { RepeatingGroupTable } from './RepeatingGroupTable';
import { RepeatingGroupAddButton } from '../components/RepeatingGroupAddButton';
import { RepeatingGroupsEditContainer } from './RepeatingGroupsEditContainer';
import { useAppDispatch, useAppSelector } from 'src/common/hooks';

export interface IGroupProps {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  triggers?: Triggers[];
}

const gridStyle = {
  paddingTop: '12px',
};

export function GroupContainer({
  id,
  container,
  components,
}: IGroupProps): JSX.Element {
  const dispatch = useAppDispatch();
  const renderComponents: ILayoutComponent[] = JSON.parse(
    JSON.stringify(components),
  );

  const editIndex = useAppSelector(state => state.formLayout.uiConfig.repeatingGroups[id]?.editIndex ?? -1);
  const [filteredIndexList, setFilteredIndexList] =
    React.useState<number[]>(null);
  const [multiPageIndex, setMultiPageIndex] = React.useState<number>(-1);

  const validations = useAppSelector(state => state.formValidations.validations);
  const currentView = useAppSelector(state => state.formLayout.uiConfig.currentView);
  const language = useAppSelector(state => state.language.language);
  const repeatingGroups = useAppSelector(state => state.formLayout.uiConfig.repeatingGroups);
  const hiddenFields = useAppSelector(state =>
    getHiddenFieldsForGroup(state.formLayout.uiConfig.hiddenFields, components),
  );
  const GetHiddenSelector = makeGetHidden();
  const hidden = useAppSelector(state => GetHiddenSelector(state, { id }));
  const formData = useAppSelector(state => state.formData.formData);
  const layout = useAppSelector(state => state.formLayout.layouts[state.formLayout.uiConfig.currentView]);
  const options = useAppSelector(state => state.optionState.options);
  const textResources = useAppSelector(state => state.textResources.resources);
  const getRepeatingGroupIndex = (containerId: string) => {
    if (repeatingGroups && repeatingGroups[containerId]) {
      return repeatingGroups[containerId].count;
    }
    return -1;
  };
  const repeatingGroupIndex = getRepeatingGroupIndex(id);
  const repeatingGroupDeepCopyComponents = useMemo(() => createRepeatingGroupComponents(
    container,
    renderComponents,
    repeatingGroupIndex,
    textResources,
    hiddenFields,
  ), [container, renderComponents, repeatingGroupIndex, textResources, hiddenFields]);

  const tableHasErrors = useMemo(() => repeatingGroupHasValidations(
    container,
    repeatingGroupDeepCopyComponents,
    validations,
    currentView,
    repeatingGroups,
    layout,
  ), [container, repeatingGroupDeepCopyComponents, validations, currentView, repeatingGroups, layout]);

  React.useEffect(() => {
    if (container.edit?.filter && container.edit.filter.length > 0) {
      container.edit.filter.forEach((rule: any) => {
        const formDataKeys: string[] = Object.keys(formData).filter((key) => {
          const keyWithoutIndex = key.replaceAll(/\[\d*\]/g, '');
          return keyWithoutIndex === rule.key && formData[key] === rule.value;
        });
        if (formDataKeys && formDataKeys.length > 0) {
          const filtered = formDataKeys.map((key) => {
            const match = key.match(/\[(\d*)\]/g);
            const currentIndex = match[match.length - 1];
            return parseInt(
              currentIndex.substring(1, currentIndex.indexOf(']')),
              10,
            );
          });
          setFilteredIndexList(filtered);
        }
      });
    }
  }, [formData, container]);

  const onClickAdd = useCallback(() => {
    dispatch(FormLayoutActions.updateRepeatingGroups({ layoutElementId: id }));
    if (container.edit?.mode !== 'showAll') {
      dispatch(
        FormLayoutActions.updateRepeatingGroupsEditIndex({
          group: id,
          index: repeatingGroupIndex + 1,
        }),
      );
    }
  }, [container.edit?.mode, dispatch, id, repeatingGroupIndex]);

  React.useEffect(() => {
    const { edit } = container;
    if (!edit) {
      return;
    }

    if (edit.multiPage) {
      setMultiPageIndex(0);
    }

    if (edit.openByDefault && repeatingGroupIndex === -1) {
      onClickAdd();
    }
  }, [container, onClickAdd, repeatingGroupIndex]);

  const onKeypressAdd = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'Spacebar'
    ) {
      onClickAdd();
    }
  };

  const onClickRemove = (groupIndex: number) => {
    dispatch(
      FormLayoutActions.updateRepeatingGroupsEditIndex({
        group: id,
        index: -1,
      }),
    );
    dispatch(
      FormLayoutActions.updateRepeatingGroups({
        layoutElementId: id,
        remove: true,
        index: groupIndex,
      }),
    );

    if (
      container.edit?.openByDefault &&
      groupIndex === 0 &&
      repeatingGroups[id].count === 0
    ) {
      dispatch(
        FormLayoutActions.updateRepeatingGroups({ layoutElementId: id }),
      );
      dispatch(
        FormLayoutActions.updateRepeatingGroupsEditIndex({
          group: id,
          index: groupIndex,
        }),
      );
    }
  };

  const onClickSave = () => {
    const validate = !!container.triggers?.includes(Triggers.Validation);
    dispatch(
      FormLayoutActions.updateRepeatingGroupsEditIndex({
        group: id,
        index: -1,
        validate,
      }),
    );
  };

  const setEditIndex = (index: number) => {
    // if edit button has been clicked while edit container is open, we trigger validations if present in triggers
    const validate: boolean =
      index === -1 && !!container.triggers?.includes(Triggers.Validation);
    dispatch(
      FormLayoutActions.updateRepeatingGroupsEditIndex({
        group: id,
        index,
        validate,
      }),
    );
  };

  if (hidden) {
    return null;
  }

  return (
    <Grid container={true} item={true}>
      {(!container.edit?.mode ||
        container.edit?.mode === 'showTable' ||
        (container.edit?.mode === 'hideTable' && editIndex < 0)) && (
        <RepeatingGroupTable
          components={components}
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
          setEditIndex={setEditIndex}
          textResources={textResources}
          validations={validations}
          filteredIndexes={filteredIndexList}
        />
      )}
      <Grid container={true} justifyContent='flex-end' />
      {container.edit?.mode !== 'showAll' &&
        container.edit?.addButton !== false &&
        editIndex < 0 &&
        repeatingGroupIndex + 1 < container.maxCount && (
          <RepeatingGroupAddButton
            container={container}
            language={language}
            onClickAdd={onClickAdd}
            onKeypressAdd={onKeypressAdd}
            textResources={textResources}
          />
        )}
      {editIndex >= 0 && (
        <RepeatingGroupsEditContainer
          container={container}
          editIndex={editIndex}
          id={id}
          language={language}
          textResources={textResources}
          layout={layout}
          onClickRemove={onClickRemove}
          onClickSave={onClickSave}
          repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents}
          hideSaveButton={container.edit?.saveButton === false}
          hideDeleteButton={container.edit?.deleteButton === false}
          multiPageIndex={multiPageIndex}
          setMultiPageIndex={setMultiPageIndex}
        />
      )}
      {container.edit?.mode === 'showAll' &&
        // Generate array of length repeatingGroupIndex and iterate over indexes
        Array(repeatingGroupIndex + 1)
          .fill(0)
          .map((v, index) => {
            if (
              filteredIndexList &&
              filteredIndexList.length > 0 &&
              !filteredIndexList.includes(index)
            ) {
              return null;
            }

            return (
              <RepeatingGroupsEditContainer
                key={index}
                editIndex={index}
                container={container}
                id={id}
                language={language}
                textResources={textResources}
                layout={layout}
                onClickRemove={onClickRemove}
                onClickSave={onClickSave}
                repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents}
                hideSaveButton={true}
                hideDeleteButton={container.edit?.deleteButton === false}
              />
            );
          })}
      {container.edit?.mode === 'showAll' &&
        container.edit?.addButton !== false &&
        repeatingGroupIndex + 1 < container.maxCount && (
          <RepeatingGroupAddButton
            container={container}
            language={language}
            onClickAdd={onClickAdd}
            onKeypressAdd={onKeypressAdd}
            textResources={textResources}
          />
        )}
      {tableHasErrors && (
        <Grid container={true} style={gridStyle} direction='column'>
          <ErrorPaper
            message={getLanguageFromKey('group.row_error', language)}
          />
        </Grid>
      )}
      <Grid item={true} xs={12}>
        {validations &&
          validations[currentView] &&
          validations[currentView][id] &&
          renderValidationMessagesForComponent(
            validations[currentView][id].group,
            container.id,
          )}
      </Grid>
    </Grid>
  );
}
