import React from 'react';
import { IGenericEditComponent } from '../componentConfig';
import { EditTextResourceBinding } from './EditTextResourceBinding';
import { Accordion } from '@digdir/design-system-react';
import { useText } from '../../../hooks';
import classes from './EditTextResourceBindings.module.css';

export type TextResourceBindingKey = 'description' | 'title' | 'help' | 'body';

export interface EditTextResourceBindingsProps extends IGenericEditComponent {
  textResourceBindingKeys: string[];
}

export const EditTextResourceBindings = ({
  component,
  handleComponentChange,
  textResourceBindingKeys,
}: EditTextResourceBindingsProps) => {
  const t = useText();
  const [open, setOpen] = React.useState(true);

  const toggleAccordion = () => {
    setOpen(!open);
  };

  return (
    <Accordion>
      <Accordion.Item defaultOpen={open}>
        <Accordion.Header onHeaderClick={toggleAccordion}>{t('general.text')}</Accordion.Header>
        <Accordion.Content >
        <div className={classes.container}>
        {textResourceBindingKeys.map((key: TextResourceBindingKey) => (

          <EditTextResourceBinding
            key={key}
            component={component}
            handleComponentChange={handleComponentChange}
            textKey={key}
            labelKey={`ux_editor.modal_properties_textResourceBindings_${key}`}
            placeholderKey={`ux_editor.modal_properties_textResourceBindings_${key}_add`}
          />
      ))}
      </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
};
