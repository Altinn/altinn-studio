import React from 'react';
import type { ReactNode } from 'react';

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
import { Number } from 'nextsrc/libs/form-engine/components/Number';
import { Panel } from 'nextsrc/libs/form-engine/components/Panel';
import { Paragraph } from 'nextsrc/libs/form-engine/components/Paragraph';
import { RadioButtons } from 'nextsrc/libs/form-engine/components/RadioButtons';
import { RepeatingGroup } from 'nextsrc/libs/form-engine/components/RepeatingGroup';
import { TextArea } from 'nextsrc/libs/form-engine/components/TextArea';
import { evaluateBoolean } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import type { ComponentMap } from 'nextsrc/libs/form-engine/components';
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
        <div key={component.id}>
          Component not implemented: {component.type} ID: {component.id}
        </div>
      );
    }

    return (
      <Component
        key={component.id}
        component={component}
        renderChildren={renderChildren}
        parentBinding={parentBinding}
        itemIndex={itemIndex}
      />
    );
  }

  return (
    <div data-testid='AppHeader'>
      <div id='finishedLoading' />
      <div>{components.map((component) => renderComponent(component))}</div>
    </div>
  );
};
