import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

export interface PrintButtonProps {
  componentId: string;
  title?: string;
  onClick: () => void;
  innerGrid?: IGridStyling;
}

export function PrintButton({
  componentId,
  title = 'general.print_button_text',
  onClick,
  innerGrid,
}: PrintButtonProps) {
  const { lang } = useTranslation();

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <Button variant='secondary' color='first' onClick={onClick}>
        {lang(title)}
      </Button>
    </ComponentStructure>
  );
}
