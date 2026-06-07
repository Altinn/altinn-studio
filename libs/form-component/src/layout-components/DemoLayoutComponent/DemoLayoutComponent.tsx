import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';

export function DemoLayoutComponent() {
  const { translate } = useTranslation();

  return `This compoonent demonstrates a translated static text. The key helptext.button_title is translated as: ${translate('helptext.button_title')}`;
}
