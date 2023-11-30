import React, { Component, isValidElement } from 'react';

import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { getLanguageFromKey, useLanguage } from 'src/features/language/useLanguage';
import { getLanguageFromCode } from 'src/language/languages';
import type { ValidLangParam, ValidLanguageKey } from 'src/features/language/useLanguage';

type Param = ValidLangParam | React.ReactElement<Props, typeof Lang>;
export interface Props {
  id: ValidLanguageKey | string | undefined;
  params?: Param[];
}

type LangAsString = ReturnType<typeof useLanguage>['langAsString'];

const unrollProps = (params: Param[], langAsString: LangAsString): ValidLangParam[] =>
  params.map((param) => {
    if (isValidElement(param) && param.type === Lang) {
      return langAsString((param.props as Props).id, unrollProps((param.props as Props).params || [], langAsString));
    } else if (isValidElement(param)) {
      throw new Error('Invalid element passed to Lang component');
    }

    return param as ValidLangParam;
  });

function LangComponent<P extends Props>({ id, params }: P) {
  const { lang, langAsString } = useLanguage();
  const realParams = unrollProps(params || [], langAsString);

  return lang(id, realParams);
}

function LangComponentFallback({ id }: Props) {
  const currentLanguage = useCurrentLanguage();
  return id ? getLanguageFromKey(id, getLanguageFromCode(currentLanguage)) : undefined;
}

interface IErrorBoundary {
  error?: Error;
}

/**
 * The Lang component is a wrapper around the useLanguage hook, and is used to resolve a key to
 * a language string/element. In contrast to the useLanguage hook, this component will handle errors, such
 * as missing providers, and try to default to a fallback language.
 */
export class Lang<P extends Props> extends Component<P, IErrorBoundary> {
  constructor(props: P) {
    super(props);
    this.state = { error: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <LangComponentFallback {...this.props} />;
    }

    return <LangComponent {...this.props} />;
  }
}
