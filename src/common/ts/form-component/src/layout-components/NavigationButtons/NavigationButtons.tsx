import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';

import classes from './NavigationButtons.module.css';

export type NavigationButtonsLoadingKey = 'next' | 'previous' | 'backToSummary' | 'backToPage';

export interface NavigationButtonsProps {
  componentId: string;
  next?: string;
  back?: string;
  backToSummary?: string;
  backToPage?: string;
  backToPageParams?: (string | number | undefined)[];
  showNext?: boolean;
  showPrevious?: boolean;
  showBackToSummary?: boolean;
  showBackToPage?: boolean;
  disabled?: boolean;
  nextDisabled?: boolean;
  loadingKey?: NavigationButtonsLoadingKey;
  onClickNext?: () => void;
  onClickPrevious?: () => void;
  onClickBackToSummary?: () => void;
  onClickBackToPage?: () => void;
}

/**
 * The buttons are rendered in order BackToSummary/BackToPage -> Next -> Previous, but shown as
 * Previous -> Next -> BackToSummary via flex-direction: row-reverse so screen readers read Next first.
 */
export function NavigationButtons({
  componentId,
  next = 'navigation.next',
  back = 'navigation.previous',
  backToSummary = 'form_filler.back_to_summary',
  backToPage = 'form_filler.back_to_page',
  backToPageParams,
  showNext = false,
  showPrevious = false,
  showBackToSummary = false,
  showBackToPage = false,
  disabled = false,
  nextDisabled = false,
  loadingKey,
  onClickNext,
  onClickPrevious,
  onClickBackToSummary,
  onClickBackToPage,
}: NavigationButtonsProps) {
  const { lang, langAsString } = useTranslation();
  const loadingLabel = langAsString('general.loading');

  return (
    <ComponentStructure componentId={componentId}>
      <div data-testid='NavigationButtons' className={classes.container}>
        {showBackToPage && (
          <Button
            disabled={disabled}
            isLoading={loadingKey === 'backToPage'}
            loadingLabel={loadingLabel}
            onClick={onClickBackToPage}
          >
            {lang(backToPage, backToPageParams)}
          </Button>
        )}
        {showBackToSummary && (
          <Button
            disabled={disabled}
            isLoading={loadingKey === 'backToSummary'}
            loadingLabel={loadingLabel}
            onClick={onClickBackToSummary}
          >
            {lang(backToSummary)}
          </Button>
        )}
        {showNext && (
          <Button
            disabled={disabled || nextDisabled}
            isLoading={loadingKey === 'next'}
            loadingLabel={loadingLabel}
            onClick={onClickNext}
            variant={showBackToSummary || showBackToPage ? 'secondary' : 'primary'}
          >
            {lang(next)}
          </Button>
        )}
        {showPrevious && (
          <Button
            disabled={disabled}
            isLoading={loadingKey === 'previous'}
            loadingLabel={loadingLabel}
            variant={showNext || showBackToSummary ? 'secondary' : 'primary'}
            onClick={onClickPrevious}
          >
            {lang(back)}
          </Button>
        )}
      </div>
    </ComponentStructure>
  );
}
