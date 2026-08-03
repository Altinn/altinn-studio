import { PDFPreviewControls } from '@app/form-component/app-components/PDFPreviewControls';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { IGridStyling } from '@app/form-component/app-components/Flex';
import type {
  PDFPreviewButtonStyle,
  PDFPreviewGenerateResult,
} from '@app/form-component/app-components/PDFPreviewControls';

export interface PDFPreviewButtonProps {
  componentId: string;
  title?: string;
  buttonStyle?: PDFPreviewButtonStyle;
  disabled?: boolean;
  showErrorDetails?: boolean;
  onGenerate: (signal: AbortSignal) => Promise<PDFPreviewGenerateResult>;
  innerGrid?: IGridStyling;
}

export function PDFPreviewButton({
  componentId,
  title,
  buttonStyle,
  disabled,
  showErrorDetails,
  onGenerate,
  innerGrid,
}: PDFPreviewButtonProps) {
  const { langAsString } = useTranslation();

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <PDFPreviewControls
        title={langAsString(title ?? 'pdfPreview.defaultButtonText')}
        errorHeading={langAsString('pdfPreview.error')}
        loadingLabel={langAsString('general.loading')}
        buttonStyle={buttonStyle}
        disabled={disabled}
        showErrorDetails={showErrorDetails}
        onGenerate={onGenerate}
      />
    </ComponentStructure>
  );
}
