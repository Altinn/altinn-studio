import React from 'react';

import Grid from '@material-ui/core/Grid';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { ErrorReport } from 'src/components/message/ErrorReport';
import { SummaryComponent } from 'src/components/summary/SummaryComponent';
import { MessageBanner } from 'src/features/form/components/MessageBanner';
import { DisplayGroupContainer } from 'src/features/form/containers/DisplayGroupContainer';
import { mapGroupComponents } from 'src/features/form/containers/formUtils';
import { GroupContainer } from 'src/features/form/containers/GroupContainer';
import { PanelGroupContainer } from 'src/layout/Panel/PanelGroupContainer';
import { ReadyForPrint } from 'src/shared/components/ReadyForPrint';
import { extractBottomButtons, hasRequiredFields, topLevelComponents } from 'src/utils/formLayout';
import { renderGenericComponent } from 'src/utils/layout';
import { getFormHasErrors, missingFieldsInLayoutValidations } from 'src/utils/validation/validation';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutGroup } from 'src/layout/Group/types';
import type { ILayout, ILayoutComponent, RenderableGenericComponent } from 'src/layout/layout';

export function renderLayoutComponent(
  layoutComponent: ExprUnresolved<ILayoutComponent | ILayoutGroup>,
  layout: ILayout | undefined | null,
) {
  switch (layoutComponent.type) {
    case 'Group': {
      return RenderLayoutGroup(layoutComponent, layout);
    }
    case 'Summary': {
      return (
        <SummaryComponent
          key={layoutComponent.id}
          {...layoutComponent}
        />
      );
    }
    default: {
      return (
        <GenericComponent
          key={layoutComponent.id}
          {...layoutComponent}
        />
      );
    }
  }
}

function GenericComponent(component: ExprUnresolved<RenderableGenericComponent>, layout: ILayout) {
  return renderGenericComponent({ component, layout });
}

function RenderLayoutGroup(layoutGroup: ExprUnresolved<ILayoutGroup>, layout: ILayout | undefined | null): JSX.Element {
  const groupComponents = mapGroupComponents(layoutGroup, layout);

  const isRepeatingGroup = layoutGroup.maxCount && layoutGroup.maxCount > 1;
  if (isRepeatingGroup) {
    return (
      <GroupContainer
        container={layoutGroup}
        id={layoutGroup.id}
        key={layoutGroup.id}
        components={groupComponents}
      />
    );
  }

  const isPanel = layoutGroup.panel;
  if (isPanel) {
    return (
      <PanelGroupContainer
        components={groupComponents}
        container={layoutGroup}
        key={layoutGroup.id}
      />
    );
  }

  //treat as regular components
  return (
    <DisplayGroupContainer
      key={layoutGroup.id}
      container={layoutGroup}
      components={groupComponents}
      renderLayoutComponent={renderLayoutComponent}
    />
  );
}

export function Form() {
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const layout = useAppSelector(
    (state) => state.formLayout.layouts && state.formLayout.layouts[state.formLayout.uiConfig.currentView],
  );
  const language = useAppSelector((state) => state.language.language);
  const validations = useAppSelector((state) => state.formValidations.validations);
  const hasErrors = useAppSelector((state) => getFormHasErrors(state.formValidations.validations));

  const requiredFieldsMissing = React.useMemo(() => {
    if (validations && validations[currentView] && language) {
      return missingFieldsInLayoutValidations(validations[currentView], language);
    }

    return false;
  }, [currentView, language, validations]);

  const [mainComponents, errorReportComponents] = React.useMemo(() => {
    if (!layout) {
      return [[], []];
    }
    const topLevel = topLevelComponents(layout);
    return hasErrors ? extractBottomButtons(topLevel) : [topLevel, []];
  }, [layout, hasErrors]);

  if (!language || !layout) {
    return null;
  }

  return (
    <>
      {layout && hasRequiredFields(layout) && (
        <MessageBanner
          language={language}
          error={requiredFieldsMissing}
          messageKey={'form_filler.required_description'}
        />
      )}
      <Grid
        container={true}
        spacing={3}
        alignItems='flex-start'
      >
        {mainComponents.map((component) => renderLayoutComponent(component, layout))}
        <Grid
          item={true}
          xs={12}
          aria-live='polite'
        >
          <ErrorReport components={errorReportComponents} />
        </Grid>
      </Grid>
      <ReadyForPrint />
    </>
  );
}
