import React from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { TextResource } from '../../TextResource/TextResource';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../../hooks';

const TITLE_TEXT_RESOURCE_KEY = 'title';

type TextMainConfigProps = {
  component: FormItem;
  componentSchemaTextKeys: string[];
  handleComponentChange: (component: FormItem) => void;
};

export const TextMainConfig = ({
  component,
  componentSchemaTextKeys,
  handleComponentChange,
}: TextMainConfigProps): React.JSX.Element => {
  const { t } = useTranslation();
  const { selectedFormLayoutName } = useAppContext();

  if (
    componentSchemaTextKeys.length === 0 ||
    !componentSchemaTextKeys.includes(TITLE_TEXT_RESOURCE_KEY)
  ) {
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
      key={TITLE_TEXT_RESOURCE_KEY}
      handleIdChange={handleIdUpdate}
      handleRemoveTextResource={handleRemoveTextResource}
      label={t(`ux_editor.modal_properties_textResourceBindings_${TITLE_TEXT_RESOURCE_KEY}`)}
      textResourceId={component?.textResourceBindings?.[TITLE_TEXT_RESOURCE_KEY]}
      generateIdOptions={{
        componentId: component.id,
        layoutId: selectedFormLayoutName,
        textResourceKey: TITLE_TEXT_RESOURCE_KEY,
      }}
    />
  );
};
