import React from 'react';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { EditImage } from '../../../config/editModal/EditImage';
import type { FormItem } from '../../../../types/FormItem';
import classes from './ImageMainConfig.module.css';
import { StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type ImageMainConfigProps = {
  component: FormItem<ComponentType.Image>;
  handleComponentChange: (component: FormItem<ComponentType.Image>) => void;
};

export function ImageMainConfig({
  component,
  handleComponentChange,
}: ImageMainConfigProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.root}>
      <StudioHeading level={4} data-size='2xs' className={classes.imageHeading}>
        {t('ux_editor.properties_panel.texts.sub_title_images')}
      </StudioHeading>
      <EditImage component={component} handleComponentChange={handleComponentChange} />
    </div>
  );
}
