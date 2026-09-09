import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { ButtonColor, ButtonVariant } from '@app/form-component/app-components/Button';

export type CustomButtonStyle = 'primary' | 'secondary' | 'tertiary';
export type CustomButtonSize = 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';

const buttonStyles: {
  [style in CustomButtonStyle]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
  tertiary: { variant: 'tertiary', color: 'second' },
};

function toShorthandSize(size?: CustomButtonSize): 'sm' | 'md' | 'lg' {
  switch (size) {
    case 'sm':
    case 'small':
      return 'sm';
    case 'md':
    case 'medium':
      return 'md';
    case 'lg':
    case 'large':
      return 'lg';
    default:
      return 'md';
  }
}

export interface CustomButtonProps {
  componentId: string;
  title?: string;
  buttonStyle?: CustomButtonStyle;
  buttonColor?: ButtonColor;
  buttonSize?: CustomButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export function CustomButton({
  componentId,
  title,
  buttonStyle = 'secondary',
  buttonColor,
  buttonSize,
  disabled = false,
  isLoading = false,
  onClick,
}: CustomButtonProps) {
  const { lang, langAsString } = useTranslation();
  const style = buttonStyles[buttonStyle];

  return (
    <ComponentStructure componentId={componentId}>
      <Button
        id={`custom-button-${componentId}`}
        disabled={disabled}
        onClick={onClick}
        size={toShorthandSize(buttonSize)}
        color={buttonColor ?? style.color}
        variant={style.variant}
        isLoading={isLoading}
        loadingLabel={langAsString('general.loading')}
      >
        {lang(title)}
      </Button>
    </ComponentStructure>
  );
}
