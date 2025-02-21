import React from 'react';
import { StudioHeading, StudioSpinner } from '@studio/components';
import { RequiredIndicator } from '../../RequiredIndicator';
import classes from './HeaderMainConfig.module.css';
import { useTranslation } from 'react-i18next';
import { useComponentSchemaQuery } from '@altinn/ux-editor/hooks/queries/useComponentSchemaQuery';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { TextResource } from '../../TextResource/TextResource';

type HeaderMainConfigProps = {
  handleComponentChange: (component: FormItem) => void;
  component: FormItem;
  children?: React.ReactNode;
};

export const HeaderMainConfig = ({
  component,
  handleComponentChange,
  children,
}: HeaderMainConfigProps): JSX.Element => {
  const { t } = useTranslation();
  const { data: schema } = useComponentSchemaQuery(component.type);

  if (!schema) {
    return (
      <StudioSpinner
        showSpinnerTitle
        spinnerTitle={t('ux_editor.properties_panel.texts.loading')}
      />
    );
  }

  const handleIdUpdate = (value: string) => {
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        title: value,
      },
    });
  };

  const handleRemoveTextResource = () => {
    const componentCopy = { ...component };
    delete componentCopy.textResourceBindings?.title;
    handleComponentChange(componentCopy);
  };

  const titleKey = Object.keys(schema.properties?.textResourceBindings?.properties?.title || {})[0];

  return (
    <div className={classes.componentMainConfig}>
      <StudioHeading size='2xs'>
        {t('ux_editor.component_properties.main_configuration')}
        <RequiredIndicator />
      </StudioHeading>
      {titleKey && (
        <TextResource
          handleIdChange={handleIdUpdate}
          handleRemoveTextResource={handleRemoveTextResource}
          label={t(`ux_editor.modal_properties_textResourceBindings_${titleKey}`)}
          textResourceId={component?.textResourceBindings?.[titleKey]}
        />
      )}
      {children}
    </div>
  );
};
