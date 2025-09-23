import React, { forwardRef } from 'react';
import { Route, Routes } from 'react-router-dom';
import type { JSX, ReactNode } from 'react';

import { type ComponentValidation } from 'src/features/validation';
import { type SummaryRendererProps } from 'src/layout/LayoutComponent';
import { SubformDef } from 'src/layout/Subform/config.def.generated';
import { SubformComponent } from 'src/layout/Subform/SubformComponent';
import { SubformValidator } from 'src/layout/Subform/SubformValidator';
import { RedirectBackToMainForm, SubformForm, SubformWrapper } from 'src/layout/Subform/SubformWrapper';
import { SubformSummaryComponent } from 'src/layout/Subform/Summary/SubformSummaryComponent';
import { SubformSummaryComponent2 } from 'src/layout/Subform/Summary/SubformSummaryComponent2';
import { useValidateSubform } from 'src/layout/Subform/useValidateSubform';
import type { PropsFromGenericComponent, SubRouting, ValidateComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Subform extends SubformDef implements ValidateComponent, SubRouting {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Subform'>>(
    function LayoutComponentSubformRender(props, _): JSX.Element | null {
      return <SubformComponent {...props} />;
    },
  );

  subRouting({ baseComponentId }: { baseComponentId: string }): ReactNode {
    return (
      <Routes>
        <Route
          path=':dataElementId/:subformPage?'
          element={
            <SubformWrapper baseComponentId={baseComponentId}>
              <SubformForm />
            </SubformWrapper>
          }
        />
        <Route
          path='*'
          element={<RedirectBackToMainForm />}
        />
      </Routes>
    );
  }

  renderLayoutValidators(props: NodeValidationProps<'Subform'>): JSX.Element | null {
    return <SubformValidator {...props} />;
  }

  renderSummaryBoilerplate(): boolean {
    return true;
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <SubformSummaryComponent {...props} />;
  }

  renderSummary2(props: Summary2Props) {
    return <SubformSummaryComponent2 {...props} />;
  }

  useComponentValidation(baseComponentId: string): ComponentValidation[] {
    return useValidateSubform(baseComponentId);
  }
}
