import { Button } from '../../app-components/Button';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import type { IGridStyling } from '../../app-components/Flex';

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
