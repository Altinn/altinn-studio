import React, { useCallback, useMemo } from 'react';

import { Grid, makeStyles } from '@material-ui/core';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import ErrorPaper from 'src/components/message/ErrorPaper';
import { ExprDefaultsForGroup } from 'src/features/expressions';
import { useExpressions } from 'src/features/expressions/useExpressions';
import { RepeatingGroupAddButton } from 'src/features/form/components/RepeatingGroupAddButton';
import { RepeatingGroupsEditContainer } from 'src/features/form/containers/RepeatingGroupsEditContainer';
import { RepeatingGroupsLikertContainer } from 'src/features/form/containers/RepeatingGroupsLikertContainer';
import { RepeatingGroupTable } from 'src/features/form/containers/RepeatingGroupTable';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { makeGetHidden } from 'src/selectors/getLayoutData';
import { Triggers } from 'src/types';
import {
  createRepeatingGroupComponents,
  getRepeatingGroupFilteredIndices,
} from 'src/utils/formLayout';
import { getHiddenFieldsForGroup } from 'src/utils/layout';
import { renderValidationMessagesForComponent } from 'src/utils/render';
import { repeatingGroupHasValidations } from 'src/utils/validation';
import type { ILayoutComponent, ILayoutGroup } from 'src/features/form/layout';
import type { IRuntimeState } from 'src/types';

import { getLanguageFromKey } from 'altinn-shared/utils';

export interface IGroupProps {
  id: string;
  container: ILayoutGroup;
  components: (ILayoutComponent | ILayoutGroup)[];
  triggers?: Triggers[];
}

const gridStyle = {
  paddingTop: '12px',
};

const useStyles = makeStyles({
  minusMargin: {
    left: '24px',
    width: 'calc(100% + 48px)',
    position: 'relative',
    marginLeft: '-48px',
    '@media (min-width:768px)': {
      left: '50px',
      width: 'calc(100% + 48px)',
      marginLeft: '-74px',
    },
    '@media (min-width:993px)': {
      left: '37px',
      width: 'calc(100% + 154px)',
    },
    '& &': {
      width: '100%',
      marginLeft: '0',
      left: '0',
      '& div[role=button]': {
        margin: '0 -24px',
      },
    },
  },
});

export function GroupContainer({
  id,
  container,
  components,
}: IGroupProps): JSX.Element {
  const dispatch = useAppDispatch();
  const renderComponents: ILayoutComponent[] = JSON.parse(
    JSON.stringify(components),
  );

  const edit = useExpressions(container.edit, {
    forComponentId: id,
    defaults: ExprDefaultsForGroup.edit,
  });

  const editIndex = useAppSelector(
    (state: IRuntimeState) =>
      state.formLayout.uiConfig.repeatingGroups[id]?.editIndex ?? -1,
  );
  const deletingIndexes = useAppSelector(
    (state: IRuntimeState) =>
      state.formLayout.uiConfig.repeatingGroups[id]?.deletingIndex ?? [],
  );
  const [filteredIndexList, setFilteredIndexList] =
    React.useState<number[]>(null);
  const [multiPageIndex, setMultiPageIndex] = React.useState<number>(-1);

  const attachments = useAppSelector(
    (state: IRuntimeState) => state.attachments.attachments,
  );

  const validations = useAppSelector(
    (state) => state.formValidations.validations,
  );
  const currentView = useAppSelector(
    (state) => state.formLayout.uiConfig.currentView,
  );
  const language = useAppSelector((state) => state.language.language);
  const repeatingGroups = useAppSelector(
    (state) => state.formLayout.uiConfig.repeatingGroups,
  );
  const hiddenFields = useAppSelector((state) =>
    getHiddenFieldsForGroup(state.formLayout.uiConfig.hiddenFields, components),
  );
  const GetHiddenSelector = makeGetHidden();
  const hidden = useAppSelector((state) => GetHiddenSelector(state, { id }));
  const formData = useAppSelector((state) => state.formData.formData);
  const layout = useAppSelector(
    (state) => state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );
  const options = useAppSelector((state) => state.optionState.options);
  const textResources = useAppSelector(
    (state) => state.textResources.resources,
  );
  const repeatingGroupIndex =
    repeatingGroups && repeatingGroups[id] ? repeatingGroups[id].index : -1;
  const repeatingGroupDeepCopyComponents = useMemo(
    () =>
      createRepeatingGroupComponents(
        container,
        renderComponents,
        repeatingGroupIndex,
        textResources,
        hiddenFields,
      ),
    [
      container,
      renderComponents,
      repeatingGroupIndex,
      textResources,
      hiddenFields,
    ],
  );

  const tableHasErrors = useMemo(
    () =>
      repeatingGroupHasValidations(
        container,
        repeatingGroupDeepCopyComponents,
        validations,
        currentView,
        repeatingGroups,
        layout,
      ),
    [
      container,
      repeatingGroupDeepCopyComponents,
      validations,
      currentView,
      repeatingGroups,
      layout,
    ],
  );

  React.useEffect(() => {
    const filteredIndexList = getRepeatingGroupFilteredIndices(
      formData,
      edit?.filter,
    );
    if (filteredIndexList) {
      setFilteredIndexList(filteredIndexList);
    }
  }, [formData, edit]);

  const onClickAdd = useCallback(() => {
    dispatch(FormLayoutActions.updateRepeatingGroups({ layoutElementId: id }));
    if (edit?.mode !== 'showAll') {
      dispatch(
        FormLayoutActions.updateRepeatingGroupsEditIndex({
          group: id,
          index: repeatingGroupIndex + 1,
        }),
      );
    }
  }, [edit?.mode, dispatch, id, repeatingGroupIndex]);

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
      FormLayoutActions.updateRepeatingGroups({
        layoutElementId: id,
        remove: true,
        index: groupIndex,
      }),
    );
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

  const setEditIndex = (index: number, forceValidation?: boolean) => {
    // if edit button has been clicked while edit container is open, we trigger validations if present in triggers
    const validate: boolean =
      (index === -1 || forceValidation) &&
      !!container.triggers?.includes(Triggers.Validation);
    dispatch(
      FormLayoutActions.updateRepeatingGroupsEditIndex({
        group: id,
        index,
        validate,
      }),
    );
  };

  const classes = useStyles();

  if (hidden) {
    return null;
  }

  if (edit?.mode === 'likert') {
    return (
      <>
        <RepeatingGroupsLikertContainer
          id={id}
          repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents.map(
            (c) => c[0] as ILayoutComponent,
          )}
          textResources={textResources}
          container={container}
        />
        {tableHasErrors && (
          <Grid
            container={true}
            style={gridStyle}
            direction='column'
          >
            <ErrorPaper
              message={getLanguageFromKey('group.row_error', language)}
            />
          </Grid>
        )}
      </>
    );
  }

  return (
    <Grid
      container={true}
      item={true}
      className={classes.minusMargin}
    >
      {(!edit?.mode ||
        edit?.mode === 'showTable' ||
        (edit?.mode === 'hideTable' && editIndex < 0)) && (
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
          hideDeleteButton={edit?.deleteButton === false}
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
        repeatingGroupIndex + 1 < container.maxCount && (
          <RepeatingGroupAddButton
            id={`add-button-${id}`}
            container={container}
            language={language}
            onClickAdd={onClickAdd}
            onKeypressAdd={onKeypressAdd}
            textResources={textResources}
          />
        )}
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
          onClickSave={onClickSave}
          repeatingGroupDeepCopyComponents={repeatingGroupDeepCopyComponents}
          hideSaveButton={edit?.saveButton === false}
          multiPageIndex={multiPageIndex}
          setMultiPageIndex={setMultiPageIndex}
          showSaveAndNextButton={edit?.saveAndNextButton === true}
          filteredIndexes={filteredIndexList}
        />
      )}
      {edit?.mode === 'showAll' &&
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
                repeatingGroupIndex={repeatingGroupIndex}
                container={container}
                id={id}
                language={language}
                deleting={deletingIndexes.includes(index)}
                textResources={textResources}
                layout={layout}
                onClickSave={onClickSave}
                onClickRemove={onClickRemove}
                repeatingGroupDeepCopyComponents={
                  repeatingGroupDeepCopyComponents
                }
                hideSaveButton={true}
                hideDeleteButton={edit?.deleteButton === false}
              />
            );
          })}
      {edit?.mode === 'showAll' &&
        edit?.addButton !== false &&
        repeatingGroupIndex + 1 < container.maxCount && (
          <RepeatingGroupAddButton
            id={`add-button-${id}`}
            container={container}
            language={language}
            onClickAdd={onClickAdd}
            onKeypressAdd={onKeypressAdd}
            textResources={textResources}
          />
        )}
      {tableHasErrors && (
        <Grid
          container={true}
          style={gridStyle}
          direction='column'
          data-testid={'group-table-errors'}
        >
          <ErrorPaper
            message={getLanguageFromKey('group.row_error', language)}
          />
        </Grid>
      )}
      <Grid
        item={true}
        xs={12}
      >
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
