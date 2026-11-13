import { useTranslation } from 'react-i18next';
import type { PaginationTexts } from '@studio/components';

export const usePaginationTexts = (): PaginationTexts => {
  const { t } = useTranslation();
  return {
    pageSizeLabel: t('dashboard.rows_per_page'),
    totalRowsText: t('dashboard.total_count'),
    nextButtonAriaLabel: t('general.next'),
    previousButtonAriaLabel: t('general.previous'),
    numberButtonAriaLabel: (number) => `${t('general.page')} ${number}`,
  };
};
