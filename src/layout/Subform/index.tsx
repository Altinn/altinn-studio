import React, { forwardRef } from 'react';
import { Route, Routes } from 'react-router-dom';
import type { JSX, ReactNode } from 'react';

import { Form, FormFirstPage } from 'src/components/form/Form';
import { TaskStoreProvider } from 'src/core/contexts/taskStoreContext';
import {
  type ComponentValidation,
  FrontendValidationSource,
  type SubformValidation,
  type ValidationDataSources,
  ValidationMask,
} from 'src/features/validation';
import { SubformDef } from 'src/layout/Subform/config.def.generated';
import { SubformComponent } from 'src/layout/Subform/SubformComponent';
import { SubformValidator } from 'src/layout/Subform/SubformValidator';
import { RedirectBackToMainForm, SubformWrapper } from 'src/layout/Subform/SubformWrapper';
import { SubformSummaryComponent } from 'src/layout/Subform/Summary/SubformSummaryComponent';
import { SubformSummaryComponent2 } from 'src/layout/Subform/Summary/SubformSummaryComponent2';
import type { PropsFromGenericComponent, SubRouting, ValidateComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { SubformSummaryOverrideProps } from 'src/layout/Summary2/config.generated';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Subform extends SubformDef implements ValidateComponent<'Subform'>, SubRouting<'Subform'> {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Subform'>>(
    function LayoutComponentSubformRender(props, _): JSX.Element | null {
      return <SubformComponent {...props} />;
    },
  );

  subRouting({ node }: { node: LayoutNode<'Subform'> }): ReactNode {
    return (
      <TaskStoreProvider>
        <Routes>
          <Route
            path=':dataElementId/:subformPage'
            element={
              <SubformWrapper node={node}>
                <Form />
              </SubformWrapper>
            }
          />
          <Route
            path=':dataElementId'
            element={
              <SubformWrapper node={node}>
                <FormFirstPage />
              </SubformWrapper>
            }
          />
          <Route
            path='*'
            element={<RedirectBackToMainForm />}
          />
        </Routes>
      </TaskStoreProvider>
    );
  }

  renderLayoutValidators(props: NodeValidationProps<'Subform'>): JSX.Element | null {
    return <SubformValidator {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return true;
  }

  renderSummary({ targetNode }: SummaryRendererProps<'Subform'>): JSX.Element | null {
    return <SubformSummaryComponent targetNode={targetNode} />;
  }

  renderSummary2(props: Summary2Props<'Subform'>) {
    return (
      <SubformSummaryComponent2
        displayType={(props.override as SubformSummaryOverrideProps)?.display}
        subformId={props.target?.id}
        componentNode={props.target}
      />
    );
  }

  runComponentValidation(
    node: LayoutNode<'Subform'>,
    {
      applicationMetadata,
      instance,
      nodeDataSelector,
      layoutSets,
      dataElementHasErrorsSelector,
    }: ValidationDataSources,
  ): ComponentValidation[] {
    const layoutSetName = nodeDataSelector((picker) => picker(node)?.layout.layoutSet, [node]);
    if (!layoutSetName) {
      throw new Error(`Layoutset not found for node with id ${node.id}.`);
    }
    const targetType = layoutSets.sets.find((set) => set.id === layoutSetName)?.dataType;
    if (!targetType) {
      throw new Error(`Data type not found for layout with name ${layoutSetName}`);
    }
    const dataTypeDefinition = applicationMetadata.dataTypes.find((x) => x.id === targetType);
    if (dataTypeDefinition === undefined) {
      return [];
    }

    const validations: ComponentValidation[] = [];

    const dataElements = instance?.data.filter((x) => x.dataType === targetType);
    const numDataElements = dataElements?.length ?? 0;
    const { minCount, maxCount } = dataTypeDefinition;

    if (minCount > 0 && numDataElements < minCount) {
      validations.push({
        message: { key: 'form_filler.error_min_count_not_reached_subform', params: [minCount, targetType] },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Required,
      });
    }

    if (maxCount > 0 && numDataElements > maxCount) {
      validations.push({
        message: { key: 'form_filler.error_max_count_reached_subform_local', params: [targetType, maxCount] },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Required,
      });
    }

    const subformIdsWithError = dataElements?.map((dE) => dE.id).filter((id) => dataElementHasErrorsSelector(id));
    if (subformIdsWithError?.length) {
      const validation: SubformValidation = {
        subformDataElementIds: subformIdsWithError,
        message: { key: 'form_filler.error_validation_inside_subform', params: [targetType] },
        severity: 'error',
        source: FrontendValidationSource.Component,
        category: ValidationMask.Required,
      };

      validations.push(validation);
    }

    return validations;
  }
}
