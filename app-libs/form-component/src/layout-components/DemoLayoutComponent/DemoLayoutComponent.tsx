import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

export interface DemoLayoutComponentProps {
  content: string;
}
export function DemoLayoutComponent({ content }: DemoLayoutComponentProps) {
  const { langAsString, lang } = useTranslation();

  return (
    <>
      <h2>This component demonstrates translating and parsing text</h2>
      <p>
        The static text with key helptext.button_title is translated as:{' '}
        {langAsString('helptext.button_title')}
      </p>
      <p>Below is content set with props a text, but can be html or mark down</p>
      <div>{lang(content)}</div>
    </>
  );
}
