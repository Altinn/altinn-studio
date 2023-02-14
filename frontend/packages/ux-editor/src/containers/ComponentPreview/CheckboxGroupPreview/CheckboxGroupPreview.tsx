import React from 'react';
import { IGenericEditComponent } from '../../../components/config/componentConfig';
import { CheckboxGroup } from '@digdir/design-system-react';
import { IFormCheckboxComponent } from '../../../types/global';
import classes from './CheckboxGroupPreview.module.css';
import { TextResource } from '../../../components/TextResource';
import { useText } from '../../../hooks';
import {
  changeComponentOptionLabel,
  changeDescriptionBinding,
  changeTitleBinding,
} from '../../../utils/component';
import { AddOption } from '../../../components/AddOption';
import { TranslationKey } from 'language/type';

export interface CheckboxGroupPreviewProps extends IGenericEditComponent {
  component: IFormCheckboxComponent;
}

export const CheckboxGroupPreview = ({
  component,
  handleComponentChange,
  layoutName,
}: CheckboxGroupPreviewProps) => {
  const t = useText();
  const tCheckboxes = (key: string) => t(`ux_editor.checkboxes_${key}` as TranslationKey);

  const changeOptionLabel = (value: string, label: string) =>
    handleComponentChange(changeComponentOptionLabel(component, value, label));

  const changeLegend = (legend: string) =>
    handleComponentChange(changeTitleBinding(component, legend));

  const changeDescription = (description: string) =>
    handleComponentChange(changeDescriptionBinding(component, description));

  return (
    <div className={classes.root}>
      <CheckboxGroup
        legend={
          <TextResource
            handleIdChange={changeLegend}
            placeholder={tCheckboxes('legend_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.title}
            generateIdOptions={{
              componentId: component.id,
              layoutId: layoutName,
              textResourceKey: 'title',
            }}
          />
        }
        description={
          <TextResource
            handleIdChange={changeDescription}
            placeholder={tCheckboxes('description_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.description}
            generateIdOptions={{
              componentId: component.id,
              layoutId: layoutName,
              textResourceKey: 'description',
            }}
          />
        }
        items={
          component.options?.map(({ value, label }) => ({
            name: value,
            label: (
              <TextResource
                handleIdChange={(id) => changeOptionLabel(value, id)}
                placeholder={tCheckboxes('option_label_placeholder')}
                previewMode
                textResourceId={label}
              />
            ),
          })) || []
        }
        presentation
      />
      {!component.optionsId && (
        <AddOption<IFormCheckboxComponent>
          addButtonClass={classes.addCheckbox}
          component={component}
          duplicateErrorText={tCheckboxes('option_value_error_duplicate')}
          emptyErrorText={tCheckboxes('option_value_error_empty')}
          handleComponentChange={handleComponentChange}
        />
      )}
    </div>
  );
};
