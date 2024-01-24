import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal, ITextResourceBindings } from 'src/layout/layout';

export type ICustomComponentProps = PropsFromGenericComponent<'Custom'> & {
  [key: string]: string | number | boolean | object | null | undefined;
};

export type IPassedOnProps = Omit<PropsFromGenericComponent<'Custom'>, 'node' | 'componentValidations'> &
  Omit<CompInternal<'Custom'>, 'tagName'> & {
    [key: string]: string | number | boolean | object | null | undefined;
    text: string | undefined;
    getTextResourceAsString: (textResource: string | undefined) => string;
  };

export function CustomWebComponent({
  node,
  componentValidations,
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
  const { formData, setValue } = useDataModelBindings(dataModelBindings);

  React.useLayoutEffect(() => {
    const { current } = wcRef;
    if (current) {
      const handleChange = (customEvent: CustomEvent) => {
        const { value, field } = customEvent.detail;
        setValue(field, value);
      };

      current.addEventListener('dataChanged', handleChange);
      return () => {
        current.removeEventListener('dataChanged', handleChange);
      };
    }
  }, [setValue, wcRef]);

  React.useLayoutEffect(() => {
    const { current } = wcRef;
    if (current) {
      current.texts = getTextsForComponent(textResourceBindings, langTools);
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

function getTextsForComponent(textResourceBindings: ITextResourceBindings<'Custom'>, langTools: IUseLanguage) {
  const result: any = {};
  const bindings = textResourceBindings || {};
  Object.keys(bindings).forEach((key) => {
    result[key] = langTools.langAsString(bindings[key]);
  });
  return result;
}
