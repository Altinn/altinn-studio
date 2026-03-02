import React, { memo, useCallback } from 'react';
import type { ReactNode } from 'react';

import { useStore } from 'zustand';

import { evaluateBoolean } from 'nextsrc/libs/form-client/expressions/evaluate';
import type { ExpressionDataSources } from 'nextsrc/libs/form-client/expressions/evaluate';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { ComponentErrorBoundary } from 'nextsrc/libs/form-engine/ComponentErrorBoundary';
import { Accordion } from 'nextsrc/libs/form-engine/components/Accordion/Accordion';
import { AccordionGroup } from 'nextsrc/libs/form-engine/components/AccordionGroup/AccordionGroup';
import { ActionButton } from 'nextsrc/libs/form-engine/components/ActionButton/ActionButton';
import { Address } from 'nextsrc/libs/form-engine/components/Address/Address';
import { Alert } from 'nextsrc/libs/form-engine/components/Alert/Alert';
import { Audio } from 'nextsrc/libs/form-engine/components/Audio/Audio';
import { Button } from 'nextsrc/libs/form-engine/components/Button/Button';
import { ButtonGroup } from 'nextsrc/libs/form-engine/components/ButtonGroup/ButtonGroup';
import { Cards } from 'nextsrc/libs/form-engine/components/Cards/Cards';
import { Checkboxes } from 'nextsrc/libs/form-engine/components/Checkboxes/Checkboxes';
import { Custom } from 'nextsrc/libs/form-engine/components/Custom/Custom';
import { Date } from 'nextsrc/libs/form-engine/components/Date/Date';
import { Datepicker } from 'nextsrc/libs/form-engine/components/Datepicker/Datepicker';
import { Divider } from 'nextsrc/libs/form-engine/components/Divider/Divider';
import { Dropdown } from 'nextsrc/libs/form-engine/components/Dropdown/Dropdown';
import { Grid } from 'nextsrc/libs/form-engine/components/Grid/Grid';
import { Group } from 'nextsrc/libs/form-engine/components/Group/Group';
import { Header } from 'nextsrc/libs/form-engine/components/Header/Header';
import { IFrame } from 'nextsrc/libs/form-engine/components/IFrame/IFrame';
import { Image } from 'nextsrc/libs/form-engine/components/Image/Image';
import { Input } from 'nextsrc/libs/form-engine/components/Input/Input';
import { Link } from 'nextsrc/libs/form-engine/components/Link/Link';
import { MultipleSelect } from 'nextsrc/libs/form-engine/components/MultipleSelect/MultipleSelect';
import { NavigationBar } from 'nextsrc/libs/form-engine/components/NavigationBar/NavigationBar';
import { NavigationButtons } from 'nextsrc/libs/form-engine/components/NavigationButtons/NavigationButtons';
import { Number } from 'nextsrc/libs/form-engine/components/Number/Number';
import { Option } from 'nextsrc/libs/form-engine/components/Option/Option';
import { OrganisationLookup } from 'nextsrc/libs/form-engine/components/OrganisationLookup/OrganisationLookup';
import { Panel } from 'nextsrc/libs/form-engine/components/Panel/Panel';
import { Paragraph } from 'nextsrc/libs/form-engine/components/Paragraph/Paragraph';
import { PersonLookup } from 'nextsrc/libs/form-engine/components/PersonLookup/PersonLookup';
import { PrintButton } from 'nextsrc/libs/form-engine/components/PrintButton/PrintButton';
import { RadioButtons } from 'nextsrc/libs/form-engine/components/RadioButtons/RadioButtons';
import { RepeatingGroup } from 'nextsrc/libs/form-engine/components/RepeatingGroup/RepeatingGroup';
import { Summary } from 'nextsrc/libs/form-engine/components/Summary/Summary';
import { Summary2 } from 'nextsrc/libs/form-engine/components/Summary2/Summary2';
import { Tabs } from 'nextsrc/libs/form-engine/components/Tabs/Tabs';
import { Text } from 'nextsrc/libs/form-engine/components/Text/Text';
import { TextArea } from 'nextsrc/libs/form-engine/components/TextArea/TextArea';
import { TimePicker } from 'nextsrc/libs/form-engine/components/TimePicker/TimePicker';
import { Video } from 'nextsrc/libs/form-engine/components/Video/Video';
import { findComponentById, getSimpleBinding } from 'nextsrc/libs/form-engine/utils/findComponent';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';
import type { ComponentMap } from 'nextsrc/libs/form-engine/components';

export const defaultComponentMap: ComponentMap = {
  Accordion,
  AccordionGroup,
  ActionButton,
  Address,
  Alert,
  Audio,
  Button,
  ButtonGroup,
  Cards,
  Checkboxes,
  Custom,
  Date,
  Datepicker,
  Divider,
  Dropdown,
  Grid,
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
  OrganisationLookup,
  Panel,
  Paragraph,
  PersonLookup,
  PrintButton,
  RadioButtons,
  RepeatingGroup,
  Summary,
  Summary2,
  Tabs,
  Text,
  TextArea,
  TimePicker,
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

const ComponentRenderer = memo(function ComponentRenderer({
  component,
  componentMap,
  parentBinding,
  itemIndex,
}: ComponentRendererProps) {
  const client = useFormClient();

  // Build expression data sources with component lookup for repeating group support
  const buildDataSources = (): ExpressionDataSources => {
    const formDataGetter = (path: string) => client.formDataStore.getState().getValue(path);

    const componentLookup = (componentId: string) => {
      const target = findComponentById(client, componentId);
      if (!target) {
        return undefined;
      }
      const rawBinding = getSimpleBinding(target);
      if (!rawBinding) {
        return undefined;
      }
      // If we're inside a repeating group row, transpose the binding path
      // e.g. "rapport.rapportering.agentforetak.opphoerEllerBekreftelse"
      //    → "rapport.rapportering.agentforetak[0].opphoerEllerBekreftelse"
      if (parentBinding !== undefined && itemIndex !== undefined) {
        const groupBase = parentBinding;
        if (rawBinding === groupBase || rawBinding.startsWith(`${groupBase}.`)) {
          const indexed = `${groupBase}[${itemIndex}]`;
          const transposed = rawBinding === groupBase ? indexed : indexed + rawBinding.slice(groupBase.length);
          return formDataGetter(transposed);
        }
      }
      return formDataGetter(rawBinding);
    };

    return {
      formDataGetter,
      instanceDataSources: client.textResourceDataSources.instanceDataSources,
      frontendSettings: client.textResourceDataSources.applicationSettings,
      componentLookup,
    };
  };

  // Evaluate hidden expression inside a Zustand selector so this component
  // only re-renders when the boolean result actually changes, not on every
  // form data update.
  const isHidden = useStore(client.formDataStore, () => {
    if (!component.hidden) {
      return false;
    }
    return evaluateBoolean(component.hidden, buildDataSources(), false);
  });

  // Stabilize renderChildren so child components don't lose memo benefits
  const renderChildren = useCallback(
    (children: ResolvedCompExternal[]): ReactNode =>
      children.map((child) => (
        <ComponentRenderer
          key={child.id}
          component={child}
          componentMap={componentMap}
          parentBinding={parentBinding}
          itemIndex={itemIndex}
        />
      )),
    [componentMap, parentBinding, itemIndex],
  );

  if (isHidden) {
    return null;
  }

  const Component = componentMap[component.type];
  if (!Component) {
    return <div>Component not implemented: {component.type} ID: {component.id}</div>;
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
});
