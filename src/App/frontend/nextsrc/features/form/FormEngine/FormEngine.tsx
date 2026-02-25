import React from 'react';
import type { ReactNode } from 'react';

import {
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
  Number,
  Panel,
  Paragraph,
  RadioButtons,
  RepeatingGroup,
  TextArea,
} from 'nextsrc/features/form/components';
import { evaluateBoolean } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import type { ComponentMap } from 'nextsrc/features/form/components';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

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
  Number,
  Panel,
  Paragraph,
  RadioButtons,
  RepeatingGroup,
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
  const client = useFormClient();

  const expressionDataSources = {
    formDataGetter: (path: string) => client.formDataStore.getState().getValue(path),
    instanceDataSources: client.textResourceDataSources.instanceDataSources,
    frontendSettings: client.textResourceDataSources.applicationSettings,
  };

  function renderChildren(children: ResolvedCompExternal[]): ReactNode {
    return children.map((child) => renderComponent(child));
  }

  function renderComponent(component: ResolvedCompExternal): ReactNode {
    const isHidden = evaluateBoolean(component.hidden, expressionDataSources, false);
    if (isHidden) {
      return null;
    }

    const Component = componentMap[component.type];
    if (!Component) {
      return (
        <li key={component.id}>
          Component not implemented: {component.type} ID: {component.id}
        </li>
      );
    }

    return (
      <li key={component.id}>
        <Component
          component={component}
          renderChildren={renderChildren}
          parentBinding={parentBinding}
          itemIndex={itemIndex}
        />
      </li>
    );
  }

  return (
    <div data-testid='AppHeader'>
      <div id='finishedLoading' />
      <ul>{components.map((component) => renderComponent(component))}</ul>
    </div>
  );
};
