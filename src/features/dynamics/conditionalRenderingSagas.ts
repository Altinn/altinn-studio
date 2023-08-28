import deepEqual from 'fast-deep-equal';
import { put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { Triggers } from 'src/layout/common.generated';
import { ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ExprConfig } from 'src/features/expressions/types';
import type { IUpdateHiddenComponents } from 'src/features/layout/formLayoutTypes';
import type { IHiddenLayoutsExternal, IRuntimeState } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { IValidations } from 'src/utils/validation/types';

export const FormValidationSelector = (state: IRuntimeState) => state.formValidations.validations;

export function* removeHiddenValidationsSaga({
  payload: { newlyHidden, newlyVisible },
}: PayloadAction<IUpdateHiddenComponents>): SagaIterator {
  const formValidations: IValidations = yield select(FormValidationSelector);
  const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
  const newFormValidations = structuredClone(formValidations);
  let validationsChanged = false;

  for (const layoutId of Object.keys(newFormValidations)) {
    const layout = newFormValidations[layoutId];
    const layoutObj = resolvedNodes.findLayout(layoutId);
    for (const componentId of newlyHidden) {
      if (layout[componentId]) {
        delete layout[componentId];
        validationsChanged = true;
      }
    }
    for (const componentId of newlyVisible) {
      const node = layoutObj?.findById(componentId) || resolvedNodes.findById(componentId);
      if (
        node &&
        'dataModelBindings' in node.item &&
        node.item.dataModelBindings &&
        'triggers' in node.item &&
        node.item.triggers &&
        node.item.triggers.includes(Triggers.Validation)
      ) {
        for (const dataModelBinding of Object.values(node.item.dataModelBindings)) {
          yield put(
            ValidationActions.runSingleFieldValidation({
              componentId,
              layoutId,
              dataModelBinding: dataModelBinding as string,
            }),
          );
        }
      }
    }
  }
  if (validationsChanged) {
    yield put(
      ValidationActions.updateValidations({
        validationResult: { validations: newFormValidations },
        merge: false,
      }),
    );
  }
}

export function runExpressionRules(layouts: LayoutPages, future: Set<string>) {
  const shouldIncludeGroups = true;
  for (const layout of Object.values(layouts.all())) {
    for (const node of layout.flat(shouldIncludeGroups)) {
      if (node.isHidden({ respectLegacy: false })) {
        future.add(node.item.id);
      }
    }
  }
}

export function runExpressionsForLayouts(
  nodes: LayoutPages,
  hiddenLayoutsExpr: IHiddenLayoutsExternal,
  dataSources: ContextDataSources,
): Set<string> {
  const config: ExprConfig<ExprVal.Boolean> = {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  };

  const hiddenLayouts: Set<string> = new Set();
  for (const key of Object.keys(hiddenLayoutsExpr)) {
    const layout = nodes.findLayout(key);
    if (!layout) {
      continue;
    }

    let isHidden = hiddenLayoutsExpr[key];
    if (typeof isHidden === 'object' && isHidden !== null) {
      isHidden = evalExpr(isHidden, layout, dataSources, { config }) as boolean;
    }
    if (isHidden === true) {
      hiddenLayouts.add(key);
    }
  }

  return hiddenLayouts;
}

export function shouldUpdate(currentList: Set<string>, newList: Set<string>): boolean {
  if (currentList.size !== newList.size) {
    return true;
  }

  const present = [...currentList.values()].sort();
  const future = [...newList.values()].sort();

  return !deepEqual(present, future);
}
