import React from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { TextResource } from '../../TextResource/TextResource';
import { useTranslation } from 'react-i18next';
import type { ITextResourceBindings } from '@altinn/ux-editor/types/global';

type TextMainConfigProps = {
  component: FormItem;
  title?: ITextResourceBindings;
  handleComponentChange: (component: FormItem) => void;
};

export const TextMainConfig = ({
  component,
  title,
  handleComponentChange,
}: TextMainConfigProps): React.JSX.Element => {
  const { t } = useTranslation();
  const titleKey = Object.keys(title || {})[0];

  if (!titleKey) {
    return null;
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

  return (
    <TextResource
      handleIdChange={handleIdUpdate}
      handleRemoveTextResource={handleRemoveTextResource}
      label={t(`ux_editor.modal_properties_textResourceBindings_${titleKey}`)}
      textResourceId={component?.textResourceBindings?.[titleKey]}
    />
  );
};
