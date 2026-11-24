import { PDFPreviewControls } from '../../app-components/PDFPreviewControls';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import type { IGridStyling } from '../../app-components/Flex';
import type {
  PDFPreviewButtonStyle,
  PDFPreviewGenerateResult,
} from '../../app-components/PDFPreviewControls';

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
