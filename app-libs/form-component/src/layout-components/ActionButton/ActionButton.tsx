import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { ButtonColor, ButtonVariant } from '@app/form-component/app-components/Button';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

export type ActionButtonStyle = 'primary' | 'secondary';

const buttonStyles: {
  [style in ActionButtonStyle]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export interface ActionButtonProps {
  componentId: string;
  id?: string;
  title: string;
  buttonStyle: ActionButtonStyle;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  innerGrid?: IGridStyling;
}

export function ActionButton({
  componentId,
  id,
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
        id={id}
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
