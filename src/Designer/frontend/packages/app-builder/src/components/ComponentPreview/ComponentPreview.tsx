import { useState } from 'react';
import type { ChangeEvent, ComponentType, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Checkboxes,
  ComponentStructure,
  getLabelId,
  Heading,
  Input,
  LabelComponent,
  Paragraph,
  TextAreaLayout,
} from '@app/form-component';
import type { CheckboxesOption, HeadingSize } from '@app/form-component';
import type { LayoutComponent } from '../../types';
import { getStaticBoolean, getTextKey } from '../../utils/componentUtils';
import classes from './ComponentPreview.module.css';

type PreviewProps = {
  component: LayoutComponent;
};

/**
 * Turns each supported component type from the layout file into props for the shared component
 * that the app renders. The canvas has no app logic: expressions are not evaluated, nothing is
 * validated, and values typed into a field stay on the canvas.
 */
const previews: Partial<Record<string, ComponentType<PreviewProps>>> = {
  Checkboxes: CheckboxesPreview,
  Heading: HeadingPreview,
  // Input is not extracted to the shared library yet, so it is put together from shared parts.
  Input: InputPreview,
  Paragraph: ParagraphPreview,
  TextArea: TextAreaPreview,
};

export function ComponentPreview({ component }: PreviewProps): ReactElement {
  const Preview = previews[component.type];
  return Preview ? (
    <Preview component={component} />
  ) : (
    <UnsupportedComponent component={component} />
  );
}

function HeadingPreview({ component }: PreviewProps): ReactElement {
  return (
    <Heading
      componentId={component.id}
      title={getTextKey(component, 'title')}
      help={getTextKey(component, 'help')}
      size={component.size as HeadingSize}
    />
  );
}

function ParagraphPreview({ component }: PreviewProps): ReactElement {
  return (
    <Paragraph
      id={component.id}
      title={getTextKey(component, 'title')}
      help={getTextKey(component, 'help')}
    />
  );
}

function InputPreview({ component }: PreviewProps): ReactElement {
  const [value, setValue] = useState<string>('');
  const labelId = getLabelId(component.id);
  return (
    <LabelComponent
      id={labelId}
      htmlFor={component.id}
      title={getTextKey(component, 'title')}
      description={getTextKey(component, 'description')}
      help={getTextKey(component, 'help')}
      required={getStaticBoolean(component.required)}
      readOnly={getStaticBoolean(component.readOnly)}
    >
      <ComponentStructure componentId={component.id}>
        <Input
          id={component.id}
          aria-labelledby={labelId}
          value={value}
          readOnly={getStaticBoolean(component.readOnly)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
        />
      </ComponentStructure>
    </LabelComponent>
  );
}

function TextAreaPreview({ component }: PreviewProps): ReactElement {
  const [value, setValue] = useState<string>('');
  return (
    <TextAreaLayout
      componentId={component.id}
      value={value}
      onChange={setValue}
      title={getTextKey(component, 'title')}
      description={getTextKey(component, 'description')}
      help={getTextKey(component, 'help')}
      required={getStaticBoolean(component.required)}
      readOnly={getStaticBoolean(component.readOnly)}
      maxLength={component.maxLength}
    />
  );
}

function CheckboxesPreview({ component }: PreviewProps): ReactElement {
  const [values, setValues] = useState<string[]>([]);
  const handleChange = (value: string, checked: boolean): void =>
    setValues((current) => (checked ? [...current, value] : current.filter((v) => v !== value)));
  return (
    <Checkboxes
      componentId={component.id}
      options={getInlineOptions(component)}
      value={values}
      onChange={handleChange}
      title={getTextKey(component, 'title')}
      description={getTextKey(component, 'description')}
      help={getTextKey(component, 'help')}
      required={getStaticBoolean(component.required)}
      readOnly={getStaticBoolean(component.readOnly)}
      layout={component.layout}
    />
  );
}

// Options from code lists are not loaded on the canvas yet.
function getInlineOptions(component: LayoutComponent): CheckboxesOption[] {
  const options: unknown[] = Array.isArray(component.options) ? component.options : [];
  return options.map((option: Record<string, unknown>) => ({
    value: String(option.value),
    label: String(option.label),
    description: typeof option.description === 'string' ? option.description : undefined,
    helpText: typeof option.helpText === 'string' ? option.helpText : undefined,
  }));
}

function UnsupportedComponent({ component }: PreviewProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.unsupportedComponent}>
      {t('app_builder.unsupported_component', { componentType: component.type })}
      <span className={classes.componentId}>{component.id}</span>
    </div>
  );
}
