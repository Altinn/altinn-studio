import React, { useEffect, useState } from 'react';

import { Spinner } from '@app/form-component';
import { Alert } from '@digdir/designsystemet-react';

import { useRegisteredComponent } from 'src/features/customReact/registry';
import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useCustomReactProps } from 'src/layout/CustomReact/useCustomReactProps';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

/**
 * How long to wait for the app to register a component before showing an error. In production, app scripts are
 * classic scripts that run before the app frontend renders, so the component is normally registered before the
 * first render. The wait covers scripts that are loaded asynchronously.
 */
export const REGISTRATION_TIMEOUT_MS = 10_000;

export function CustomReactComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'CustomReact'>) {
  const showLabel = (overrideDisplay?.renderLabel ?? true) && overrideDisplay?.renderedInTable !== true;

  return (
    <ComponentStructureWrapper
      baseComponentId={baseComponentId}
      label={showLabel ? { baseComponentId, renderLabelAs: 'span' } : undefined}
    >
      <CustomReactRenderer
        baseComponentId={baseComponentId}
        summaryMode={false}
      />
    </ComponentStructureWrapper>
  );
}

export function CustomReactRenderer({
  baseComponentId,
  summaryMode,
}: {
  baseComponentId: string;
  summaryMode: boolean;
}) {
  const { componentName } = useItemWhenType(baseComponentId, 'CustomReact');
  const Component = useRegisteredComponent(componentName);
  const props = useCustomReactProps(baseComponentId, summaryMode);

  if (!Component) {
    return (
      <WaitingForRegistration
        baseComponentId={baseComponentId}
        componentName={componentName}
      />
    );
  }

  return <Component {...props} />;
}

function WaitingForRegistration({
  baseComponentId,
  componentName,
}: {
  baseComponentId: string;
  componentName: string;
}) {
  const [timedOut, setTimedOut] = useState(false);
  const { langAsString } = useLanguage();
  const nodeId = useIndexedId(baseComponentId);
  const addError = FormStore.layoutDiagnostics.useAddError();

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), REGISTRATION_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (timedOut) {
      const error =
        `React component "${componentName}" (component '${baseComponentId}') was not registered. Make sure the app ` +
        `registers it with window.altinnAppFrontend.registerComponent()`;
      window.logError(error);
      addError(error, nodeId, 'node');
    }
  }, [addError, baseComponentId, componentName, nodeId, timedOut]);

  if (timedOut) {
    // data-fatal-error stops PDF generation, as the PDF would be missing this part of the form
    return (
      <Alert
        data-color='danger'
        data-fatal-error
      >
        <Lang id='custom_react.not_registered' />
      </Alert>
    );
  }

  // The spinner has the data-loading attribute, which makes PDF generation wait for the component
  return (
    <Spinner
      aria-label={langAsString('general.loading')}
      data-size='sm'
    />
  );
}
