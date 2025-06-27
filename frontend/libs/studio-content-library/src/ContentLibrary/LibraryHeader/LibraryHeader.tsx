import React from 'react';
import classes from './LibraryHeader.module.css';
import { studioBetaTagClasses, StudioHeading } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { BookIcon } from '@studio/icons';
import cn from 'classnames';
import { UrlUtils, StringUtils } from '@studio/pure-functions';
import { ORG_LIBRARY_BASENAME } from 'app-shared/constants';

export function LibraryHeader(): React.ReactElement {
  const { t } = useTranslation();

  const headingText = isOrgLibraryPage()
    ? t('org_content_library.library_heading')
    : t('app_content_library.library_heading');

  return (
    <div className={classes.libraryHeading}>
      <BookIcon className={classes.headingIcon} />
      <StudioHeading size='small' className={cn(classes.headingText, studioBetaTagClasses.isBeta)}>
        {headingText}
      </StudioHeading>
    </div>
  );
}

function isOrgLibraryPage(): boolean {
  const orgLibraryPathSegment: string = StringUtils.removeLeadingSlash(ORG_LIBRARY_BASENAME);
  const secondLastPathSegment: string = UrlUtils.extractSecondLastRouterParam(location.pathname);
  return orgLibraryPathSegment === secondLastPathSegment;
}
