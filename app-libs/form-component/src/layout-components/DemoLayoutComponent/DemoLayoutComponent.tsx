import { useCurrentLanguage, useTranslation } from '@app/form-component/LanguageTranslatorProvider';

export interface DemoLayoutComponentProps {
  content: string;
}
export function DemoLayoutComponent({ content }: DemoLayoutComponentProps) {
  const { langAsString, lang } = useTranslation();
  const currentLanguage = useCurrentLanguage();

  return (
    <>
      <h2>This component demonstrates translating and parsing text</h2>
      <p>
        The static text with key helptext.button_title is translated as:{' '}
        {langAsString('helptext.button_title')}
      </p>
      <p>The current language is: {currentLanguage}</p>
      <p>
        Below is the content. It is a property of type text, but the text can be html or markdown
        and will be parsed accordingly.
      </p>
      <div>{lang(content)}</div>
    </>
  );
}
