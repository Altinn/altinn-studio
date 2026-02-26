import React from 'react';
import type { ReactNode } from 'react';

import { useStore } from 'zustand';

import { evaluateBoolean } from 'nextsrc/libs/form-client/expressions/evaluate';
import type { ExpressionDataSources } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { ComponentErrorBoundary } from 'nextsrc/libs/form-engine/ComponentErrorBoundary';
import { Accordion } from 'nextsrc/libs/form-engine/components/Accordion';
import { AccordionGroup } from 'nextsrc/libs/form-engine/components/AccordionGroup';
import { Alert } from 'nextsrc/libs/form-engine/components/Alert';
import { Button } from 'nextsrc/libs/form-engine/components/Button';
import { ButtonGroup } from 'nextsrc/libs/form-engine/components/ButtonGroup';
import { Checkboxes } from 'nextsrc/libs/form-engine/components/Checkboxes';
import { Datepicker } from 'nextsrc/libs/form-engine/components/Datepicker';
import { Divider } from 'nextsrc/libs/form-engine/components/Divider';
import { Dropdown } from 'nextsrc/libs/form-engine/components/Dropdown';
import { Group } from 'nextsrc/libs/form-engine/components/Group';
import { Header } from 'nextsrc/libs/form-engine/components/Header';
import { Image } from 'nextsrc/libs/form-engine/components/Image';
import { Input } from 'nextsrc/libs/form-engine/components/Input';
import { Link } from 'nextsrc/libs/form-engine/components/Link';
import { MultipleSelect } from 'nextsrc/libs/form-engine/components/MultipleSelect';
import { NavigationBar } from 'nextsrc/libs/form-engine/components/NavigationBar';
import { NavigationButtons } from 'nextsrc/libs/form-engine/components/NavigationButtons';
import { Number } from 'nextsrc/libs/form-engine/components/Number';
import { Panel } from 'nextsrc/libs/form-engine/components/Panel';
import { Paragraph } from 'nextsrc/libs/form-engine/components/Paragraph';
import { RadioButtons } from 'nextsrc/libs/form-engine/components/RadioButtons';
import { RepeatingGroup } from 'nextsrc/libs/form-engine/components/RepeatingGroup';
import { Summary2 } from 'nextsrc/libs/form-engine/components/Summary2';
import { TextArea } from 'nextsrc/libs/form-engine/components/TextArea';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';
import type { ComponentMap } from 'nextsrc/libs/form-engine/components';

export const defaultComponentMap: ComponentMap = {
  Accordion,
  AccordionGroup,
  Alert,
  Button,
  ButtonGroup,
  Checkboxes,
  Datepicker,
  Divider,
  Dropdown,
  Group,
  Header,
  Image,
  Input,
  Link,
  MultipleSelect,
  NavigationBar,
  NavigationButtons,
  Number,
  Panel,
  Paragraph,
  RadioButtons,
  RepeatingGroup,
  Summary2,
  TextArea,
};

interface FormEngineProps {
  components: ResolvedCompExternal[];
  componentMap?: ComponentMap;
  parentBinding?: string;
  itemIndex?: number;
}

export const FormEngine = ({
  components,
  componentMap = defaultComponentMap,
  parentBinding,
  itemIndex,
}: FormEngineProps) => {
  return (
    <div data-testid='AppHeader'>
      <div id='finishedLoading' />
      <div>
        {components.map((component) => (
          <ComponentRenderer
            key={component.id}
            component={component}
            componentMap={componentMap}
            parentBinding={parentBinding}
            itemIndex={itemIndex}
          />
        ))}
      </div>
    </div>
  );
};

interface ComponentRendererProps {
  component: ResolvedCompExternal;
  componentMap: ComponentMap;
  parentBinding?: string;
  itemIndex?: number;
}

const ComponentRenderer = ({ component, componentMap, parentBinding, itemIndex }: ComponentRendererProps) => {
  const client = useFormClient();

  // Subscribe to form data so hidden expressions re-evaluate on every data change
  useStore(client.formDataStore, (s) => s.data);

  const expressionDataSources: ExpressionDataSources = {
    formDataGetter: (path: string) => client.formDataStore.getState().getValue(path),
    instanceDataSources: client.textResourceDataSources.instanceDataSources,
    frontendSettings: client.textResourceDataSources.applicationSettings,
  };

  const isHidden = evaluateBoolean(component.hidden, expressionDataSources, false);
  if (isHidden) {
    return null;
  }

  const Component = componentMap[component.type];
  if (!Component) {
    return <div>Component not implemented: {component.type} ID: {component.id}</div>;
  }

  function renderChildren(children: ResolvedCompExternal[]): ReactNode {
    return children.map((child) => (
      <ComponentRenderer
        key={child.id}
        component={child}
        componentMap={componentMap}
        parentBinding={parentBinding}
        itemIndex={itemIndex}
      />
    ));
  }

  return (
    <ComponentErrorBoundary componentId={component.id} componentType={component.type}>
      <Component
        component={component}
        renderChildren={renderChildren}
        parentBinding={parentBinding}
        itemIndex={itemIndex}
      />
    </ComponentErrorBoundary>
  );
};
