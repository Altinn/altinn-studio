import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import classes from './AccessListMembers.module.css';
import type { BrregSearchResult } from 'app-shared/types/ResourceAdm';

export interface AccessListMembersPagingProps {
  resultData: BrregSearchResult;
  setSearchUrl: (url: string) => void;
}

export const AccessListMembersPaging = ({
  resultData,
  setSearchUrl,
}: AccessListMembersPagingProps): React.JSX.Element => {
  const { t } = useTranslation();
  const renderPageButton = (
    href: string,
    label: string,
    isDisabled: boolean,
  ): React.JSX.Element => {
    return (
      <StudioButton
        size='small'
        variant='tertiary'
        disabled={isDisabled}
        onClick={() => setSearchUrl(href)}
      >
        {t(label)}
      </StudioButton>
    );
  };

  return (
    <div className={classes.paginationWrapper}>
      {renderPageButton(
        resultData?.links?.first?.href,
        'resourceadm.listadmin_search_first',
        !resultData?.links?.first || !resultData?.links?.prev,
      )}
      {renderPageButton(
        resultData?.links?.prev?.href,
        'resourceadm.listadmin_search_prev',
        !resultData?.links?.prev,
      )}
      {renderPageButton(
        resultData?.links?.next?.href,
        'resourceadm.listadmin_search_next',
        !resultData?.links?.next,
      )}
      {renderPageButton(
        resultData?.links?.last?.href,
        'resourceadm.listadmin_search_last',
        !resultData?.links?.last || !resultData?.links?.next,
      )}
      {!!resultData?.page?.totalElements && (
        <div>
          {t('resourceadm.listadmin_search_paging', {
            from: resultData.page.number * resultData.page.size + 1,
            to: Math.min(
              (resultData.page.number + 1) * resultData.page.size,
              resultData.page.totalElements,
            ),
            total: resultData.page.totalElements,
          })}
        </div>
      )}
    </div>
  );
};
