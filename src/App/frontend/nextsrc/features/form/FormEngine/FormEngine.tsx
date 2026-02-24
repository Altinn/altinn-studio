import React from 'react';
import type { ReactElement } from 'react';

import { marked } from 'marked';
import { GlobalData } from 'nextsrc/core/globalData';
import { useFormValue } from 'nextsrc/libs/form-client/form-context';
import { extractField, resolveChildBindings } from 'nextsrc/libs/form-client/resolveBindings';
import type { FormDataNode } from 'nextsrc/core/apiClient/dataApi';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompParagraphExternal } from 'src/layout/Paragraph/config.generated';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

const InputComponent = (props: CompInputExternal) => {
  const path = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useFormValue(path);

  if (!path) {
    return (
      <input
        type='text'
        disabled
      />
    );
  }

  return (
    <div>
      <input
        type='text'
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};

const ParagraphComponent = (props: CompParagraphExternal) => {
  const resolvedTitle = GlobalData.textResources?.resources.find(
    (resource) => resource.id === props.textResourceBindings?.title,
  );

  const cleanTitle = marked(resolvedTitle?.value ?? '', { async: false });

  return (
    <div>
      <pre>{JSON.stringify(props, null, 2)}</pre>
      <div dangerouslySetInnerHTML={{ __html: cleanTitle }} />
    </div>
  );
};

type Override<T, K extends keyof T, NewType> = Omit<T, K> & {
  [P in K]: NewType;
};

type OverriddenRepeatingGroupWithChildComponents = Override<
  CompRepeatingGroupExternal,
  'children',
  ResolvedCompExternal[]
>;

const RepeatingGroupNext = (props: OverriddenRepeatingGroupWithChildComponents) => {
  const groupField = extractField(props.dataModelBindings.group);
  const { value } = useFormValue(groupField);

  if (!Array.isArray(value)) {
    return <div />;
  }

  return (
    <div style={{ border: '1px solid blue' }}>
      {value.map((_, idx) => (
        <FormEngine
          key={idx}
          components={resolveChildBindings(props.children, groupField, idx)}
          data={value}
        />
      ))}
    </div>
  );
};

function isRepeatingGroup(props: ResolvedCompExternal): props is OverriddenRepeatingGroupWithChildComponents {
  return props.type === 'RepeatingGroup' && Array.isArray(props.children);
}

function renderComponent(componentProps: ResolvedCompExternal): ReactElement | null {
  switch (componentProps.type) {
    case 'Input':
      return <InputComponent {...componentProps} />;
    case 'RepeatingGroup':
      if (isRepeatingGroup(componentProps)) {
        return <RepeatingGroupNext {...componentProps} />;
      }
      return null;
    case 'Paragraph': {
      return <ParagraphComponent {...componentProps} />;
    }
    default:
      return null;
  }
}

interface FormEngineProps {
  components: ResolvedCompExternal[];
  data: FormDataNode;
}

export const FormEngine = ({ components }: FormEngineProps) => (
  <div data-testid='AppHeader'>
    <div id='finishedLoading' />
    <ul>
      {components.map((componentProps) => {
        const rendered = renderComponent(componentProps);
        if (!rendered) {
          return (
            <li key={componentProps.id}>
              Component not implemented: {componentProps.type} ID: {componentProps.id}
            </li>
          );
        }

        return <li key={componentProps.id}>{rendered}</li>;
      })}
    </ul>
  </div>
);
