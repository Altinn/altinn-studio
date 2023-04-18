import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { Close } from '@navikt/ds-icons';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { LayoutInspectorItem } from 'src/features/devtools/components/LayoutInspector/LayoutInspectorItem';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';

export const LayoutInspector = () => {
  const { currentView } = useAppSelector((state) => state.formLayout.uiConfig);
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentProperties, setComponentProperties] = useState<string | null>(null);
  const [propertiesHaveChanged, setPropertiesHaveChanged] = useState(false);
  const [error, setError] = useState<boolean>(false);

  const dispatch = useDispatch();

  const currentLayout = layouts?.[currentView];

  useEffect(() => {
    setSelectedComponent(null);
  }, [currentView]);

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
        const updatedLayout = currentLayout?.map((component) => {
          if (component.id === selectedComponent) {
            return updatedComponent;
          } else {
            return component;
          }
        });

        dispatch(FormLayoutActions.updateLayouts({ [currentView]: updatedLayout }));

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

  return (
    <SplitView direction='row'>
      <div className={classes.container}>
        <ul className={classes.list}>
          {currentLayout?.map((component) => (
            <LayoutInspectorItem
              key={component.id}
              component={component}
              onClick={() => setSelectedComponent(component.id)}
            />
          ))}
        </ul>
      </div>
      {selectedComponent && (
        <div className={classes.properties}>
          <div className={classes.header}>
            <h3>Egenskaper</h3>
            <Button
              onClick={() => setSelectedComponent(null)}
              variant={ButtonVariant.Quiet}
              color={ButtonColor.Secondary}
              aria-label={'close'}
              icon={<Close aria-hidden />}
            />
          </div>
          <textarea
            value={componentProperties ?? ''}
            onChange={handleChange}
          />
          {error && <span className={classes.error}>Ugyldig JSON</span>}
          {propertiesHaveChanged && <Button onClick={handleSave}>Lagre</Button>}
        </div>
      )}
    </SplitView>
  );
};
