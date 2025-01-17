import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { PropsFromGenericComponent } from 'src/layout';
import type { CompInternal, ITextResourceBindings } from 'src/layout/layout';

export type ICustomComponentProps = PropsFromGenericComponent<'Custom'> & {
  [key: string]: string | number | boolean | object | null | undefined;
  summaryMode?: boolean;
};

export type IPassedOnProps = Omit<
  PropsFromGenericComponent<'Custom'>,
  'node' | 'componentValidations' | 'containerDivRef'
> &
  Omit<CompInternal<'Custom'>, 'tagName' | 'textResourceBindings'> & {
    [key: string]: string | number | boolean | object | null | undefined;
    text: string | undefined;
    getTextResourceAsString: (textResource: string | undefined) => string;
  };

export function CustomWebComponent({
  node,
  componentValidations,
  summaryMode = false,
  ...passThroughPropsFromGenericComponent
}: ICustomComponentProps) {
  const langTools = useLanguage();
  const { language, langAsString } = langTools;
  const { tagName, textResourceBindings, dataModelBindings, ...passThroughPropsFromNode } = useNodeItem(node);

  const { containerDivRef: _unused, ...restFromGeneric } = passThroughPropsFromGenericComponent;

  const passThroughProps: IPassedOnProps = {
    ...restFromGeneric,
    ...passThroughPropsFromNode,
    text: langAsString(textResourceBindings?.title),
    getTextResourceAsString: (textResource: string) => langAsString(textResource),
    summaryMode,
  };

  const HtmlTag = tagName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wcRef = React.useRef<any>(null);
  const { formData, setValue } = useDataModelBindings(dataModelBindings);

  React.useLayoutEffect(() => {
    const { current } = wcRef;
    if (current) {
      const handleChange = (customEvent: CustomEvent) => {
        const { value, field } = customEvent.detail;
        if (!dataModelBindings?.simpleBinding && !field) {
          throw new Error(
            'If you are not using simpleBinding, you need to include a field in your change event to indicate what datamodel binding you want to save to. See docs: https://github.com/Altinn/altinn-studio/issues/8681',
          );
        }
        if (field) {
          setValue(field, value);
          return;
        }
        setValue('simpleBinding', value);
      };

      current.addEventListener('dataChanged', handleChange);
      return () => {
        current.removeEventListener('dataChanged', handleChange);
      };
    }
  }, [dataModelBindings?.simpleBinding, setValue, wcRef]);

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

  const isHidden = Hidden.useIsHidden(node);
  if (isHidden || !HtmlTag) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propsAsAttributes: any = {};
  Object.keys(passThroughProps).forEach((key) => {
    let prop = passThroughProps[key];
    if (React.isValidElement(prop)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prop = ReactDOMServer.renderToStaticMarkup(prop as any);
    } else if (['object', 'array'].includes(typeof prop)) {
      if (key !== 'containerDivRef') {
        prop = JSON.stringify(passThroughProps[key]);
      }
    }
    propsAsAttributes[key] = prop;
  });
  return (
    <ComponentStructureWrapper node={node}>
      <HtmlTag
        ref={wcRef}
        data-testid={tagName}
        {...propsAsAttributes}
      />
    </ComponentStructureWrapper>
  );
}

function getTextsForComponent(textResourceBindings: ITextResourceBindings<'Custom'>, langTools: IUseLanguage) {
  const result: Record<string, string> = {};
  const bindings = textResourceBindings ?? {};
  Object.keys(bindings).forEach((key) => {
    result[key] = langTools.langAsString(bindings[key]);
  });
  return result;
}
