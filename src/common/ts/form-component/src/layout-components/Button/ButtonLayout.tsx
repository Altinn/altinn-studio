import type { CSSProperties } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { TextAlign } from '@app/form-component/app-components/Button';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

export type ButtonLayoutSize = 'sm' | 'md' | 'lg';
export type ButtonLayoutPosition = 'left' | 'center' | 'right';

export interface ButtonLayoutProps {
  componentId: string;
  title?: string;
  size?: ButtonLayoutSize;
  fullWidth?: boolean;
  textAlign?: TextAlign;
  position?: ButtonLayoutPosition;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
  statusMessage?: string;
  innerGrid?: IGridStyling;
}

function alignStyle(align: ButtonLayoutPosition): CSSProperties {
  switch (align) {
    case 'right':
      return { marginLeft: 'auto' };
    case 'center':
      return { margin: '0 auto' };
    default:
      return {};
  }
}

export function ButtonLayout({
  componentId,
  title,
  size,
  fullWidth,
  textAlign,
  position,
  disabled = false,
  isLoading = false,
  onClick,
  statusMessage,
  innerGrid,
}: ButtonLayoutProps) {
  const { lang, langAsString } = useTranslation();

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <Button
        id={componentId}
        style={position ? alignStyle(position) : {}}
        textAlign={textAlign}
        size={size}
        fullWidth={fullWidth}
        onClick={onClick}
        isLoading={isLoading}
        loadingLabel={langAsString('general.loading')}
        disabled={disabled}
        color='success'
      >
        {lang(title)}
      </Button>
      {statusMessage && <span style={{ position: 'absolute' }}>{lang(statusMessage)}</span>}
    </ComponentStructure>
  );
}
