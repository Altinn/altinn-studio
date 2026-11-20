import classes from './AppPreviewSubMenu.module.css';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@designer/hooks';
import { StudioLink } from '@designer/components';
import { ArrowLeftIcon } from '@designer/icons';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useBackToEditingHref } from '../../hooks/useBackToEditingHref';

export const AppPreviewSubMenu = () => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const backToEditingHref: string = useBackToEditingHref();

  return (
    <div className={classes.subHeader}>
      <StudioLink
        className={classes.link}
        aria-label={t('top_menu.preview_back_to_editing')}
        href={backToEditingHref}
      >
        <ArrowLeftIcon className={classes.icon} />
        {shouldDisplayText && t('top_menu.preview_back_to_editing')}
      </StudioLink>
    </div>
  );
};
