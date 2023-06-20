import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { useLanguage } from 'src/hooks/useLanguage';
import type { IUseLanguage } from 'src/hooks/useLanguage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ITextResourceBindings } from 'src/types';
import type { AnyItem } from 'src/utils/layout/hierarchy.types';

export type ICustomComponentProps = PropsFromGenericComponent<'Custom'> & {
  [key: string]: string | number | boolean | object | null | undefined;
};

export type IPassedOnProps = Omit<
  PropsFromGenericComponent<'Custom'>,
  'formData' | 'node' | 'componentValidations' | 'handleDataChange'
> &
  Omit<AnyItem<'Custom'>, 'tagName'> & {
    [key: string]: string | number | boolean | object | null | undefined;
    text: string | undefined;
    getTextResourceAsString: (textResource: string | undefined) => string;
  };

export function CustomWebComponent({
  node,
  formData,
  componentValidations,
  handleDataChange,
  ...passThroughPropsFromGenericComponent
}: ICustomComponentProps) {
  const langTools = useLanguage();
  const { language, langAsString } = langTools;
  const { tagName, textResourceBindings, dataModelBindings, ...passThroughPropsFromNode } = node.item;
  const passThroughProps: IPassedOnProps = {
    ...passThroughPropsFromGenericComponent,
    ...passThroughPropsFromNode,
    text: langAsString(textResourceBindings?.title),
    getTextResourceAsString: (textResource: string) => langAsString(textResource),
  };
  const Tag = tagName;
  const wcRef = React.useRef<any>(null);

  React.useLayoutEffect(() => {
    const { current } = wcRef;
    if (current) {
      const handleChange = (customEvent: CustomEvent) => {
        const { value, field } = customEvent.detail;
        handleDataChange(value, { key: field });
      };

      current.addEventListener('dataChanged', handleChange);
      return () => {
        current.removeEventListener('dataChanged', handleChange);
      };
    }
  }, [handleDataChange, wcRef]);

  React.useLayoutEffect(() => {
    const { current } = wcRef;
    if (current) {
      current.texts = getTextsForComponent(textResourceBindings || {}, langTools);
      current.dataModelBindings = dataModelBindings;
      current.language = language;
    }
  }, [wcRef, textResourceBindings, dataModelBindings, langTools, language]);

  React.useLayoutEffect(() => {
    const { current } = wcRef;
    if (current) {
      current.formData = formData;
      current.componentValidations = componentValidations;
    }
  }, [formData, componentValidations]);

  if (node.isHidden() || !Tag) {
    return null;
  }

  const propsAsAttributes: any = {};
  Object.keys(passThroughProps).forEach((key) => {
    let prop = passThroughProps[key];
    if (React.isValidElement(prop)) {
      prop = ReactDOMServer.renderToStaticMarkup(prop as any);
    } else if (['object', 'array'].includes(typeof prop)) {
      prop = JSON.stringify(passThroughProps[key]);
    }
    propsAsAttributes[key] = prop;
  });

  return (
    <div>
      <Tag
        ref={wcRef}
        data-testid={tagName}
        {...propsAsAttributes}
      />
    </div>
  );
}

function getTextsForComponent(textResourceBindings: ITextResourceBindings, langTools: IUseLanguage) {
  const result: any = {};
  Object.keys(textResourceBindings).forEach((key) => {
    result[key] = langTools.langAsString(textResourceBindings[key]);
  });
  return result;
}
