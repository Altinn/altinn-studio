import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

export function DemoLayoutComponent() {
  const { langAsString } = useTranslation();

  return `This component demonstrates a translated static text. The key helptext.button_title is translated as: ${langAsString('helptext.button_title')}`;
}
