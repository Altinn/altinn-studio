import React, { useRef } from 'react';
import { IGenericEditComponent } from '../../../components/config/componentConfig';
import { Radio } from '@digdir/design-system-react';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import classes from './RadioGroupPreview.module.css';
import { TextResource } from '../../../components/TextResource';
import { useText } from '../../../hooks';
import {
  changeComponentOptionLabel,
  changeDescriptionBinding,
  changeTitleBinding,
} from '../../../utils/component';
import { AddOption } from '../../../components/AddOption';
import { TranslationKey } from 'language/type';
import type { FormRadioButtonsComponent } from '../../../types/FormComponent';

export interface RadioGroupPreviewProps extends IGenericEditComponent {
  component: FormRadioButtonsComponent;
}

export const RadioGroupPreview = ({
  component,
  handleComponentChange,
  layoutName,
}: RadioGroupPreviewProps) => {
  const t = useText();
  const tRadios = (key: string) => t(`ux_editor.radios_${key}` as TranslationKey);
  const radioGroupName = useRef(generateRandomId(12));

  const changeOptionLabel = (value: string, label: string) =>
    handleComponentChange(changeComponentOptionLabel(component, value, label));

  const changeLegend = (legend: string) =>
    handleComponentChange(changeTitleBinding(component, legend));

  const changeDescription = (description: string) =>
    handleComponentChange(changeDescriptionBinding(component, description));

  return (
    <div className={classes.root}>
      <Radio.Group
        legend={
          <TextResource
            handleIdChange={changeLegend}
            placeholder={tRadios('legend_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.title}
            generateIdOptions={{
              componentId: component.id,
              layoutId: layoutName,
              textResourceKey: 'title',
            }}
            handleRemoveTextResource={() => changeLegend(undefined)}
          />
        }
        description={
          <TextResource
            handleIdChange={changeDescription}
            placeholder={tRadios('description_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.description}
            generateIdOptions={{
              componentId: component.id,
              layoutId: layoutName,
              textResourceKey: 'description',
            }}
            handleRemoveTextResource={() => changeDescription(undefined)}
          />
        }
        name={radioGroupName.current}
      >
        {component.options?.map(({ value, label }) => (
          <Radio key={value} value={value}>
            <TextResource
              handleIdChange={(id) => changeOptionLabel(value, id)}
              placeholder={tRadios('option_label_placeholder')}
              previewMode
              textResourceId={label}
              handleRemoveTextResource={() => changeOptionLabel(value, undefined)}
            />
          </Radio>)) || []
        }
      </Radio.Group>
      {!component.optionsId && (
        <AddOption<FormRadioButtonsComponent>
          addButtonClass={classes.addRadioButton}
          component={component}
          duplicateErrorText={tRadios('option_value_error_duplicate')}
          emptyErrorText={tRadios('option_value_error_empty')}
          handleComponentChange={handleComponentChange}
        />
      )}
    </div>
  );
};
