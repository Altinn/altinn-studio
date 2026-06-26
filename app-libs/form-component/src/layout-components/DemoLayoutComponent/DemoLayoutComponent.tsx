import { useEffect } from 'react';

import { useCurrentLanguage, useTranslation } from '@app/form-component/LanguageTranslatorProvider';

export type DemoVariant = 'info' | 'warning' | 'success';

export interface DemoLayoutComponentProps {
  // Studio-configurable props — these map 1:1 to options a service owner sets in Altinn Studio.
  id: string;
  title?: string;
  content: string;
  variant?: DemoVariant;
  showLanguageInfo?: boolean;

  // Runtime wiring — injected by the runtime wrapper. NOT part of the Studio configuration.
  renderedInTable?: boolean;
  dataValue?: string;
  hidden?: boolean;
  onRendered?: () => void;
}

const variantColor: Record<DemoVariant, string> = {
  info: '#0062BA',
  warning: '#A18213',
  success: '#118849',
};

export function DemoLayoutComponent({
  id,
  title,
  content,
  variant = 'info',
  showLanguageInfo = true,
  renderedInTable = false,
  dataValue,
  hidden = false,
  onRendered,
}: DemoLayoutComponentProps) {
  const { langAsString, lang } = useTranslation();
  const currentLanguage = useCurrentLanguage();

  useEffect(() => {
    onRendered?.();
  }, [onRendered]);

  if (hidden) {
    return null;
  }

  return (
    <div
      id={id}
      style={{ borderLeft: `4px solid ${variantColor[variant]}`, paddingLeft: '0.75rem' }}
    >
      {!renderedInTable && title && <h2>{lang(title)}</h2>}
      <p>
        This component demonstrates translating and parsing text. The static text with key
        helptext.button_title is translated as: {langAsString('helptext.button_title')}
      </p>
      {showLanguageInfo && <p>The current language is: {currentLanguage}</p>}
      <p>
        Below is the content. It is a property of type text, but the text can be html or markdown
        and will be parsed accordingly.
      </p>
      <div>{lang(content)}</div>
      {dataValue !== undefined && <p>Runtime-bound value: {dataValue}</p>}
    </div>
  );
}
