import React from 'react';
import type { ReactNode } from 'react';

import { useStore } from 'zustand';

import { evaluateBoolean } from 'nextsrc/libs/form-client/expressions/evaluate';
import type { ExpressionDataSources } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { ComponentErrorBoundary } from 'nextsrc/libs/form-engine/ComponentErrorBoundary';
import { Accordion } from 'nextsrc/libs/form-engine/components/Accordion';
import { AccordionGroup } from 'nextsrc/libs/form-engine/components/AccordionGroup';
import { ActionButton } from 'nextsrc/libs/form-engine/components/ActionButton';
import { Alert } from 'nextsrc/libs/form-engine/components/Alert';
import { Audio } from 'nextsrc/libs/form-engine/components/Audio';
import { Button } from 'nextsrc/libs/form-engine/components/Button';
import { ButtonGroup } from 'nextsrc/libs/form-engine/components/ButtonGroup';
import { Checkboxes } from 'nextsrc/libs/form-engine/components/Checkboxes';
import { Date } from 'nextsrc/libs/form-engine/components/Date';
import { Datepicker } from 'nextsrc/libs/form-engine/components/Datepicker';
import { Divider } from 'nextsrc/libs/form-engine/components/Divider';
import { Dropdown } from 'nextsrc/libs/form-engine/components/Dropdown';
import { Group } from 'nextsrc/libs/form-engine/components/Group';
import { Header } from 'nextsrc/libs/form-engine/components/Header';
import { IFrame } from 'nextsrc/libs/form-engine/components/IFrame';
import { Image } from 'nextsrc/libs/form-engine/components/Image';
import { Input } from 'nextsrc/libs/form-engine/components/Input';
import { Link } from 'nextsrc/libs/form-engine/components/Link';
import { MultipleSelect } from 'nextsrc/libs/form-engine/components/MultipleSelect';
import { NavigationBar } from 'nextsrc/libs/form-engine/components/NavigationBar';
import { NavigationButtons } from 'nextsrc/libs/form-engine/components/NavigationButtons';
import { Number } from 'nextsrc/libs/form-engine/components/Number';
import { Option } from 'nextsrc/libs/form-engine/components/Option';
import { Panel } from 'nextsrc/libs/form-engine/components/Panel';
import { Paragraph } from 'nextsrc/libs/form-engine/components/Paragraph';
import { PrintButton } from 'nextsrc/libs/form-engine/components/PrintButton';
import { RadioButtons } from 'nextsrc/libs/form-engine/components/RadioButtons';
import { RepeatingGroup } from 'nextsrc/libs/form-engine/components/RepeatingGroup';
import { Video } from 'nextsrc/libs/form-engine/components/Video';
import { Summary } from 'nextsrc/libs/form-engine/components/Summary';
import { Summary2 } from 'nextsrc/libs/form-engine/components/Summary2';
import { Tabs } from 'nextsrc/libs/form-engine/components/Tabs';
import { Text } from 'nextsrc/libs/form-engine/components/Text';
import { TextArea } from 'nextsrc/libs/form-engine/components/TextArea';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';
import type { ComponentMap } from 'nextsrc/libs/form-engine/components';

export const defaultComponentMap: ComponentMap = {
  Accordion,
  AccordionGroup,
  ActionButton,
  Alert,
  Audio,
  Button,
  ButtonGroup,
  Checkboxes,
  Date,
  Datepicker,
  Divider,
  Dropdown,
  Group,
  Header,
  IFrame,
  Image,
  Input,
  Link,
  MultipleSelect,
  NavigationBar,
  NavigationButtons,
  Number,
  Option,
  Panel,
  Paragraph,
  PrintButton,
  RadioButtons,
  RepeatingGroup,
  Summary,
  Summary2,
  Tabs,
  Text,
  TextArea,
  Video,
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
