/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useEffect, useRef, useState } from 'react';

import { Alert } from '@digdir/designsystemet-react';
import { XMarkIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { LayoutInspectorItem } from 'src/features/devtools/components/LayoutInspector/LayoutInspectorItem';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useLayoutValidationForPage } from 'src/features/devtools/layoutValidation/useLayoutValidation';
import { useLayouts, useLayoutSetId } from 'src/features/form/layout/LayoutsContext';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { parseAndCleanText } from 'src/language/sharedLanguage';
import type { LayoutContextValue } from 'src/features/form/layout/LayoutsContext';

export const LayoutInspector = () => {
  const selectedComponent = useDevToolsStore((state) => state.layoutInspector.selectedComponentId);
  const setSelectedComponent = useDevToolsStore((state) => state.actions.layoutInspectorSet);
  const currentView = useCurrentView();
  const layouts = useLayouts();
  const currentLayoutSetId = useLayoutSetId();
  const [componentProperties, setComponentProperties] = useState<string | null>(null);
  const [propertiesHaveChanged, setPropertiesHaveChanged] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const focusNodeInspector = useDevToolsStore((state) => state.actions.focusNodeInspector);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const scrollBarHeight = textAreaRef.current.offsetHeight - textAreaRef.current.clientHeight;
      const scrollHeight = textAreaRef.current.scrollHeight;
      textAreaRef.current.style.height = `${scrollHeight + scrollBarHeight}px`;
    }
  }, [componentProperties]);

  const currentLayout = currentView ? layouts?.[currentView] : undefined;
  const validationErrorsForPage = useLayoutValidationForPage() || {};

  useEffect(() => {
    if (selectedComponent) {
      const component = currentLayout?.find((component) => component.id === selectedComponent);
      setComponentProperties(JSON.stringify(component, null, 2));
    }
    setPropertiesHaveChanged(false);
  }, [selectedComponent, currentLayout]);

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setComponentProperties(event.target.value);
    !propertiesHaveChanged && setPropertiesHaveChanged(true);
  }

  function handleSave() {
    if (selectedComponent) {
      try {
        const updatedComponent = JSON.parse(componentProperties ?? '');

        if (currentView) {
          window.queryClient.setQueriesData<LayoutContextValue>(
            { queryKey: ['formLayouts', currentLayoutSetId] },
            (_queryData) => {
              const queryData = structuredClone(_queryData);
              if (!queryData?.layouts?.[currentView]) {
                return _queryData;
              }
              queryData.layouts[currentView] = queryData.layouts[currentView]?.map((component) =>
                component.id === selectedComponent ? updatedComponent : component,
              );
              return queryData;
            },
          );
        }

        setPropertiesHaveChanged(false);
        return;
      } catch (error) {
        console.error(error);
      }
    }
    setError(true);
    setTimeout(() => {
      setError(false);
    }, 2000);
  }

  const NodeLink = ({ nodeId }: { nodeId: string }) => (
    <div>
      <a
        href='#'
        onClick={(e) => {
          e.preventDefault();
          focusNodeInspector(nodeId);
        }}
      >
        Utforsk {nodeId} i komponenter-fanen
      </a>
    </div>
  );

  return (
    <SplitView
      direction='row'
      sizes={[300]}
    >
      <div className={classes.container}>
        <ul className={classes.list}>
          {currentLayout?.map((component) => (
            <LayoutInspectorItem
              key={component.id}
              component={component}
              selected={selectedComponent === component.id}
              hasErrors={
                validationErrorsForPage[component.id] !== undefined && validationErrorsForPage[component.id].length > 0
              }
              onClick={() => setSelectedComponent(component.id)}
            />
          ))}
        </ul>
      </div>
      {selectedComponent && (
        <div className={classes.properties}>
          <div className={classes.header}>
            <div className={classes.title}>
              <h3>Konfigurasjon</h3>
              <Button
                onClick={() => setSelectedComponent(undefined)}
                variant='tertiary'
                color='second'
                aria-label='close'
                icon={true}
              >
                <XMarkIcon
                  fontSize='1rem'
                  aria-hidden
                />
              </Button>
            </div>
            {validationErrorsForPage[selectedComponent] && validationErrorsForPage[selectedComponent].length > 0 && (
              <Alert
                className={classes.errorAlert}
                data-color='warning'
              >
                <div className={classes.errorList}>
                  <ul>
                    {validationErrorsForPage[selectedComponent].map((error) => (
                      <li key={error}>{parseAndCleanText(error)}</li>
                    ))}
                  </ul>
                </div>
              </Alert>
            )}
            <div className={classes.headerLink}>
              {!selectedComponent && 'Ingen aktive komponenter funnet'}
              {selectedComponent && <NodeLink nodeId={selectedComponent} />}
            </div>
          </div>
          <textarea
            ref={textAreaRef}
            value={componentProperties ?? ''}
            onChange={handleChange}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
                // Save when pressing ctrl + s
                !error && handleSave();
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          />
          {error && <span className={classes.error}>Ugyldig JSON</span>}
          {propertiesHaveChanged && (
            <Button
              style={{ width: '100%' }}
              onClick={handleSave}
            >
              Lagre
            </Button>
          )}
        </div>
      )}
    </SplitView>
  );
};
