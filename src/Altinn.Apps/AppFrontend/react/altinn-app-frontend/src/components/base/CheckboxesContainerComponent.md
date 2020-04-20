Simple checkbox with 3 options

```tsx
import {CheckboxContainerComponent} from './CheckboxesContainerComponent';
import Legend from '../../features/form/components/Legend';
import {nb} from '../../shared/resources/language/languages';
const dummyFunc = () => {return;}

const legend = () => {
  return (
    <Legend
      labelText={'Simple checkboxes'}
      language={nb}
      required={false}
      helpTextProps={{}}
    />
  );
}

const props = {
  id: 'simpleCheckbox',
  formData: '',
  handleDataChange: dummyFunc,
  handleFocusUpdate: dummyFunc,
  isValid: true,
  validationMessages: {},
  options: [
    {
      label: 'Label 1',
      value: 'v1',
    },
    {
      label: 'Label 2',
      value: 'v2',
    },
    {
      label: 'Label 3',
      value: 'v3',
    },
  ],
  preselectedOptionIndex: null,
  readOnly: false,
  shouldFocus: false,
  legend,
};

<CheckboxContainerComponent
  {...props}
/>

```

