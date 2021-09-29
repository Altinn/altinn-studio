/* eslint-disable no-undef */
/* eslint-disable react/no-array-index-key */
/* eslint-disable max-len */
import React from 'react';
import { Grid } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { getLanguageFromKey } from 'altinn-shared/utils';
import { repeatingGroupHasValidations } from 'src/utils/validation';
import ErrorPaper from 'src/components/message/ErrorPaper';
import { createRepeatingGroupComponents } from 'src/utils/formLayout';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { getHiddenFieldsForGroup } from 'src/utils/layout';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { ILayout, ILayoutComponent, ILayoutGroup } from '../layout';
import { FormLayoutActions } from '../layout/formLayoutSlice';
import { IRuntimeState, ITextResource, IRepeatingGroups, IValidations, Triggers } from '../../../types';
import { IFormData } from '../data/formDataReducer';
import { RepeatingGroupTable } from './RepeatingGroupTable';
import { RepeatingGroupAddButton } from '../components/RepeatingGroupAddButton';
import { RepeatingGroupsEditContainer } from './RepeatingGroupsEditContainer';

export interface IGroupProps {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  triggers?: Triggers[];
}

export function GroupContainer({
  id,
  container,
  components,
}: IGroupProps): JSX.Element {
  const dispatch = useDispatch();
  const renderComponents: ILayoutComponent[] = JSON.parse(JSON.stringify(components));

  const editIndex: number = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.repeatingGroups[id]?.editIndex ?? -1);
  const [filteredIndexList, setFilteredIndexList] = React.useState<number[]>(null);
  const [multiPageIndex, setMultiPageIndex] = React.useState<number>(-1);

  const validations: IValidations = useSelector((state: IRuntimeState) => state.formValidations.validations);
  const currentView: string = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const language: any = useSelector((state: IRuntimeState) => state.language.language);
  const repeatingGroups: IRepeatingGroups = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.repeatingGroups);
  const hiddenFields: string[] = useSelector((state: IRuntimeState) => getHiddenFieldsForGroup(state.formLayout.uiConfig.hiddenFields, components));
  const GetHiddenSelector = makeGetHidden();
  const hidden: boolean = useSelector((state: IRuntimeState) => GetHiddenSelector(state, { id }));
  const formData: IFormData = useSelector((state: IRuntimeState) => state.formData.formData);
  const layout: ILayout = useSelector((state: IRuntimeState) => state.formLayout.layouts[state.formLayout.uiConfig.currentView]);
  const options = useSelector((state: IRuntimeState) => state.optionState.options);
  const textResources: ITextResource[] = useSelector((state: IRuntimeState) => state.textResources.resources);
  const getRepeatingGroupIndex = (containerId: string) => {
    if (repeatingGroups && repeatingGroups[containerId]) {
      return repeatingGroups[containerId].count;
    }
    return -1;
  };
  const repeatingGroupIndex = getRepeatingGroupIndex(id);
  const repeatingGroupDeepCopyComponents = createRepeatingGroupComponents(
    container,
    renderComponents,
    repeatingGroupIndex,
    textResources,
    hiddenFields,
  );
  const tableHasErrors = repeatingGroupHasValidations(container, repeatingGroupDeepCopyComponents, validations, currentView, repeatingGroups, layout);

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
            return parseInt(currentIndex.substring(1, currentIndex.indexOf(']')), 10);
          });
          setFilteredIndexList(filtered);
        }
      });
    }
  }, [formData, container]);

  React.useEffect(() => {
    const {edit} = container;
    if (!edit) {
      return;
    }

    if (container.edit?.multiPage) {
      setMultiPageIndex(0);
    }

    if (container.edit.openByDefault && repeatingGroupIndex === -1) {
      onClickAdd();
    }
  }, [container]);

  const onClickAdd = () => {
    dispatch(FormLayoutActions.updateRepeatingGroups({ layoutElementId: id }));
    if (container.edit?.mode !== 'showAll') {
      dispatch(FormLayoutActions.updateRepeatingGroupsEditIndex({ group: id, index: (repeatingGroupIndex + 1) }));
    }
  };

  const onKeypressAdd = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      onClickAdd();
    }
  };

  const onClickRemove = (groupIndex: number) => {
    dispatch(FormLayoutActions.updateRepeatingGroupsEditIndex({ group: id, index: -1 }));
    dispatch(FormLayoutActions.updateRepeatingGroups({
      layoutElementId: id,
      remove: true,
      index: groupIndex,
    }));
  };

  const onClickSave = () => {
    const validate: boolean = container.triggers?.includes(Triggers.Validation);
    dispatch(FormLayoutActions.updateRepeatingGroupsEditIndex({
      group: id, index: -1, validate,
    }));
  };

  const setEditIndex = (index: number) => {
    dispatch(FormLayoutActions.updateRepeatingGroupsEditIndex({ group: id, index }));
  };

  if (hidden) {
    return null;
  }

  return (
    <Grid
      container={true}
      item={true}
    >
      { (!container.edit?.mode || container.edit?.mode === 'showTable'
        || (container.edit?.mode === 'hideTable' && editIndex < 0)) &&
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
          repeatingGroupIndex={repeatingGroupIndex}
          repeatingGroups={repeatingGroups}
          setEditIndex={setEditIndex}
          textResources={textResources}
          validations={validations}
          filteredIndexes={filteredIndexList}
        />
      }
      <Grid
        container={true}
        justify='flex-end'
      />
      {(container.edit?.mode !== 'showAll' && (editIndex < 0 && ((repeatingGroupIndex + 1) < container.maxCount))) &&
        <RepeatingGroupAddButton
          container={container}
          language={language}
          onClickAdd={onClickAdd}
          onKeypressAdd={onKeypressAdd}
          textResources={textResources}
        />
      }
      {(editIndex >= 0) &&
        <RepeatingGroupsEditContainer
          components={components}
          container={container}
          editIndex={editIndex}
          hiddenFields={hiddenFields}
          id={id}
          language={language}
          layout={layout}
          onClickRemove={onClickRemove}
          onClickSave={onClickSave}
          repeatingGroupIndex={repeatingGroupIndex}
          textResources={textResources}
          hideSaveButton={container.edit?.saveButton === false}
          hideDeleteButton={container.edit?.deleteButton === false}
          multiPageIndex={multiPageIndex}
          setMultiPageIndex={setMultiPageIndex}
        />
      }
      {container.edit?.mode === 'showAll' &&
      // Generate array of length repeatingGroupIndex and iterate over indexes
        Array(repeatingGroupIndex + 1).fill(0).map((v, index) => {
          if (filteredIndexList && filteredIndexList.length > 0 && !filteredIndexList.includes(index)) {
            return null;
          }

          return (
            <RepeatingGroupsEditContainer
              components={components}
              container={container}
              editIndex={index}
              hiddenFields={hiddenFields}
              id={id}
              language={language}
              layout={layout}
              onClickRemove={onClickRemove}
              onClickSave={onClickSave}
              repeatingGroupIndex={repeatingGroupIndex}
              textResources={textResources}
              hideSaveButton={true}
              hideDeleteButton={container.edit?.deleteButton === false}
            />
          );
        })
      }
      {(container.edit?.mode === 'showAll' && ((repeatingGroupIndex + 1) < container.maxCount)) &&
        <RepeatingGroupAddButton
          container={container}
          language={language}
          onClickAdd={onClickAdd}
          onKeypressAdd={onKeypressAdd}
          textResources={textResources}
        />
      }
      {tableHasErrors &&
      <Grid
        container={true}
        style={{ paddingTop: '12px' }}
        direction='column'
      >
        <ErrorPaper
          message={getLanguageFromKey('group.row_error', language)}
        />
      </Grid>
      }
      <Grid item={true} xs={12}>
        {validations && validations[currentView] && validations[currentView][id] &&
          renderValidationMessagesForComponent(validations[currentView][id].group, container.id)
        }
      </Grid>
    </Grid>
  );
}
