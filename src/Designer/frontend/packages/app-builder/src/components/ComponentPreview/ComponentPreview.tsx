import { useState } from 'react';
import type { ChangeEvent, ComponentType, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Checkboxes,
  ComponentStructure,
  Datepicker,
  Dropdown,
  FileUploadLayout,
  getLabelId,
  GroupLayout,
  Heading,
  Input,
  LabelComponent,
  Paragraph,
  RadioButtonsLayout,
  TextAreaLayout,
} from '@app/form-component';
import type { AlertSeverity, HeadingSize } from '@app/form-component';
import { useTranslation as useAppTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import type { LayoutComponent } from '../../types';
import { getRequiredProperty, getStaticBoolean, getTextKey } from '../../utils/componentUtils';
import { getOptionSource, resolveOptions } from '../../utils/optionUtils';
import type { ResolvedOption } from '../../utils/optionUtils';
import { PlainTextsProvider } from '../EditorTranslator/PlainTextsProvider';
import classes from './ComponentPreview.module.css';

export type ComponentPreviewProps = {
  component: LayoutComponent;
  /** A selected question shows its "optional" tag, so the user can make it required. */
  isSelected?: boolean;
};

type PreviewProps = Required<ComponentPreviewProps>;

/**
 * Turns each supported component type from the layout file into props for the shared component
 * that the app renders. The canvas has no app logic: expressions are not evaluated, nothing is
 * validated, and values typed into a field stay on the canvas.
 */
const previews: Partial<Record<string, ComponentType<PreviewProps>>> = {
  Alert: AlertPreview,
  Button: SubmitButtonPreview,
  Checkboxes: CheckboxesPreview,
  Datepicker: DatepickerPreview,
  Dropdown: DropdownPreview,
  FileUpload: FileUploadPreview,
  Group: GroupPreview,
  Header: HeadingPreview,
  Heading: HeadingPreview,
  // Input is not extracted to the shared library yet, so it is put together from shared parts.
  Input: InputPreview,
  Paragraph: ParagraphPreview,
  RadioButtons: RadioButtonsPreview,
  TextArea: TextAreaPreview,
};

export function ComponentPreview({
  component,
  isSelected = false,
}: ComponentPreviewProps): ReactElement {
  const Preview = previews[component.type];
  return Preview ? (
    <Preview component={component} isSelected={isSelected} />
  ) : (
    <UnsupportedComponent component={component} />
  );
}

/** The label props that every question shares. */
function getLabelProps({ component, isSelected }: PreviewProps) {
  // A field that is required only sometimes shows the tag, so the user can open its menu.
  const isRequired = getRequiredProperty(component).kind !== 'never';
  return {
    title: getTextKey(component, 'title'),
    description: getTextKey(component, 'description'),
    help: getTextKey(component, 'help'),
    required: isRequired,
    readOnly: getStaticBoolean(component.readOnly),
    showOptionalMarking: isSelected && !isRequired,
  };
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

function AlertPreview({ component }: PreviewProps): ReactElement {
  return (
    <Alert
      componentId={component.id}
      severity={(component.severity ?? 'info') as AlertSeverity}
      title={getTextKey(component, 'title')}
      body={getTextKey(component, 'body')}
    />
  );
}

/** The app's submit button. A div that looks like it, since a button cannot hold text that is edited. */
function SubmitButtonPreview({ component }: PreviewProps): ReactElement {
  const { lang } = useAppTranslation();
  return (
    <div className='ds-button' data-variant='primary' data-size='sm'>
      {lang(getTextKey(component, 'title'))}
    </div>
  );
}

function InputPreview(props: PreviewProps): ReactElement {
  const { component } = props;
  const [value, setValue] = useState<string>('');
  const labelProps = getLabelProps(props);
  const labelId = getLabelId(component.id);
  return (
    <LabelComponent id={labelId} htmlFor={component.id} {...labelProps}>
      <ComponentStructure componentId={component.id}>
        <Input
          id={component.id}
          aria-labelledby={labelId}
          value={value}
          readOnly={labelProps.readOnly}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
        />
      </ComponentStructure>
    </LabelComponent>
  );
}

function TextAreaPreview(props: PreviewProps): ReactElement {
  const [value, setValue] = useState<string>('');
  return (
    <TextAreaLayout
      componentId={props.component.id}
      value={value}
      onChange={setValue}
      maxLength={props.component.maxLength}
      {...getLabelProps(props)}
    />
  );
}

function DatepickerPreview(props: PreviewProps): ReactElement {
  const [value, setValue] = useState<string>('');
  return (
    <Datepicker
      componentId={props.component.id}
      value={value}
      onValueChange={setValue}
      minDate={props.component.minDate}
      maxDate={props.component.maxDate}
      {...getLabelProps(props)}
    />
  );
}

function CheckboxesPreview(props: PreviewProps): ReactElement {
  const [values, setValues] = useState<string[]>([]);
  const labelProps = getLabelProps(props);
  const handleChange = (value: string, checked: boolean): void =>
    setValues((current) => (checked ? [...current, value] : current.filter((v) => v !== value)));
  return (
    <OptionTexts component={props.component}>
      {(options) => (
        <Checkboxes
          componentId={props.component.id}
          options={options}
          value={values}
          onChange={handleChange}
          layout={props.component.layout}
          {...labelProps}
        />
      )}
    </OptionTexts>
  );
}

function RadioButtonsPreview(props: PreviewProps): ReactElement {
  const [value, setValue] = useState<string>();
  const labelProps = getLabelProps(props);
  return (
    <OptionTexts component={props.component}>
      {(options) => (
        <RadioButtonsLayout
          componentId={props.component.id}
          options={options}
          value={value}
          onChange={setValue}
          layout={props.component.layout}
          {...labelProps}
        />
      )}
    </OptionTexts>
  );
}

/**
 * A closed dropdown, without its options: its list is a Designsystemet custom element, which is only
 * defined in Studio's window and not in the canvas frame, so it would show unplaced. The options are
 * edited in the settings.
 */
function DropdownPreview(props: PreviewProps): ReactElement {
  return (
    <Dropdown
      componentId={props.component.id}
      options={[]}
      value=''
      onChange={() => {}}
      {...getLabelProps(props)}
    />
  );
}

type OptionTextsProps = {
  component: LayoutComponent;
  children: (options: ResolvedOption[]) => ReactElement;
};

/**
 * Gives the shared component the options as text keys. Inline options have app texts, which are
 * edited in place; the labels of a code list are shown as they are.
 */
function OptionTexts({ component, children }: OptionTextsProps): ReactElement {
  const { texts, codeLists } = useAppBuilder();
  if (getOptionSource(component) === 'inline') {
    const options = (Array.isArray(component.options) ? component.options : []).map(
      (option: Record<string, unknown>) => ({
        value: String(option.value),
        label: String(option.label),
      }),
    );
    return children(options);
  }
  const options = resolveOptions(component, texts, codeLists);
  const plainTexts = Object.fromEntries(
    options.map(({ value, label }) => [codeListTextKey(value), label]),
  );
  return (
    <PlainTextsProvider texts={plainTexts}>
      {children(options.map(({ value }) => ({ value, label: codeListTextKey(value) })))}
    </PlainTextsProvider>
  );
}

const codeListTextKey = (value: string): string => `code-list-option.${value}`;

function FileUploadPreview(props: PreviewProps): ReactElement {
  const { component } = props;
  return (
    <FileUploadLayout
      componentId={component.id}
      displayMode={component.displayMode}
      maxFileSizeInMB={component.maxFileSizeInMB ?? 0}
      maxNumberOfAttachments={component.maxNumberOfAttachments ?? 1}
      hasCustomFileEndings={component.hasCustomFileEndings}
      validFileEndings={component.validFileEndings}
      numberOfAttachments={0}
      onDrop={() => undefined}
      {...getLabelProps(props)}
    />
  );
}

/**
 * The group's title and description. Its children are shown after it, as components of their own, so
 * the space the group keeps for them is left out here and kept below the children instead.
 */
function GroupPreview({ component }: PreviewProps): ReactElement {
  return (
    <div className={classes.groupPreview}>
      <GroupLayout
        componentId={component.id}
        title={getTextKey(component, 'title')}
        description={getTextKey(component, 'description')}
        help={getTextKey(component, 'help')}
        headingLevel={2}
      />
    </div>
  );
}

function UnsupportedComponent({ component }: Pick<PreviewProps, 'component'>): ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.unsupportedComponent}>
      {t('app_builder.unsupported_component', { componentType: component.type })}
      <span className={classes.componentId}>{component.id}</span>
    </div>
  );
}
