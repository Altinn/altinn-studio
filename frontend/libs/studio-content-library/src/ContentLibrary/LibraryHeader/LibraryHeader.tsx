import React from 'react';
import classes from './LibraryHeader.module.css';
import { studioBetaTagClasses, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { BookIcon } from '@studio/icons';
import cn from 'classnames';

export function LibraryHeader(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className={classes.libraryHeading}>
      <BookIcon className={classes.headingIcon} />
      <StudioHeading size='small' className={cn(classes.headingText, studioBetaTagClasses.isBeta)}>
        {t('app_content_library.library_heading')}
      </StudioHeading>
    </div>
  );
}
