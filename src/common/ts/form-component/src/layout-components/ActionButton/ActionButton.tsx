import { Button } from '../../app-components/Button';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import type { ButtonColor, ButtonVariant } from '../../app-components/Button';
import type { IGridStyling } from '../../app-components/Flex';

export type ActionButtonStyle = 'primary' | 'secondary';

const buttonStyles: {
  [style in ActionButtonStyle]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export interface ActionButtonProps {
  componentId: string;
  title: string;
  buttonStyle: ActionButtonStyle;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  innerGrid?: IGridStyling;
}

export function ActionButton({
  componentId,
  title,
  buttonStyle,
  disabled = false,
  isLoading = false,
  onClick,
  innerGrid,
}: ActionButtonProps) {
  const { lang, langAsString } = useTranslation();
  const { color, variant } = buttonStyles[buttonStyle];

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <Button
        id={`action-button-${componentId}`}
        variant={variant}
        color={color}
        disabled={disabled}
        isLoading={isLoading}
        loadingLabel={langAsString('general.loading')}
        onClick={onClick}
      >
        {lang(title)}
      </Button>
    </ComponentStructure>
  );
}
