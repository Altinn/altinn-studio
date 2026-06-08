import { StudioCard, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './Infobox.module.css';

export const Infobox = () => {
  const { t } = useTranslation();

  return (
    <StudioCard className={classes.cardContainer}>
      <StudioCard.Block>
        <img
          src='/img/illustration_about-page.png'
          alt={t('app_settings.about_tab_image_alt_text')}
        />
      </StudioCard.Block>
      <StudioCard.Block className={classes.cardContent}>
        <StudioHeading level={3}>{t('app_settings.about_tab_info_box_title')}</StudioHeading>
        <StudioParagraph>{t('app_settings.about_tab_info_box_description_1')}</StudioParagraph>
        <StudioParagraph>{t('app_settings.about_tab_info_box_description_2')}</StudioParagraph>
      </StudioCard.Block>
    </StudioCard>
  );
};
