import { Button } from '@app/form-component/app-components/Button';
import { useIsMobile } from '@app/form-component/app-components/hooks';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { PencilIcon } from '@navikt/aksel-icons';

export interface SummaryEditButtonProps {
  onClick: () => void;
  /** Text-resource key for the title of the component the button edits. Screen readers read it with the button. */
  title?: string;
  /** Id of the component the button edits, put on the button as `data-target-id`. */
  targetId?: string;
  className?: string;
}

/**
 * The "Endre" button in a summary row. Whether it shows, and where it takes the user, is up to the app.
 */
export function SummaryEditButton({ onClick, title, targetId, className }: SummaryEditButtonProps) {
  const { lang, langAsString } = useTranslation();
  const isMobile = useIsMobile();
  const accessibleTitle = title ? langAsString(title) : '';

  return (
    <Button
      aria-label={isMobile ? langAsString('general.edit') : undefined}
      onClick={onClick}
      variant='tertiary'
      className={className}
      data-target-id={targetId}
    >
      {!isMobile && lang('general.edit')}
      <PencilIcon
        aria-hidden
        fontSize='1rem'
        title={`${isMobile ? langAsString('form_filler.summary_item_change') : ''} ${accessibleTitle}`}
      />
    </Button>
  );
}
