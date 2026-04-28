import type { FormComponentProps } from '../types/FormComponentProps';
import { FormComponent } from './FormComponent';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormComponentActionType } from '../types/FormComponentActionType';
import type { DataModelBinding } from '../types/DataModelBinding';

const onActionMock = vi.fn();

const title = 'Fornavn';
const dataModelBinding: DataModelBinding = {
  dataType: 'person',
  field: 'firstName',
};
const submitButtonText = 'Send inn';
const defaultProps: FormComponentProps = {
  title,
  dataModelBinding,
  onAction: onActionMock,
};

describe('FormComponent', () => {
  afterEach(() => {
    onActionMock.mockClear();
  });

  it('renders the title as the label of the input', () => {
    renderFormComponent();
    expect(screen.getByRole('textbox', { name: title })).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderFormComponent();
    expect(screen.getByRole('button', { name: submitButtonText })).toBeInTheDocument();
  });

  it('does not call onAction before the submit button is clicked', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    await user.type(screen.getByRole('textbox', { name: title }), 'Ola');
    expect(onActionMock).not.toHaveBeenCalled();
  });

  it.each<DataModelBinding>([
    { dataType: 'person', field: 'firstName' },
    { dataType: 'person', field: 'lastName' },
    { dataType: 'address', field: 'street' },
  ])(
    'emits a patchDataModel action with the data model binding $dataType.$field and the typed value when the submit button is clicked',
    async (binding) => {
      const user = userEvent.setup();
      renderFormComponent({ dataModelBinding: binding });
      await user.type(screen.getByRole('textbox', { name: title }), 'Ola');
      await user.click(screen.getByRole('button', { name: submitButtonText }));
      expect(onActionMock).toHaveBeenCalledTimes(1);
      expect(onActionMock).toHaveBeenCalledWith({
        type: FormComponentActionType.PatchDataModel,
        payload: { dataModelBinding: binding, value: 'Ola' },
      });
    },
  );

  it('emits an empty value when the submit button is clicked without typing', async () => {
    const user = userEvent.setup();
    renderFormComponent();
    await user.click(screen.getByRole('button', { name: submitButtonText }));
    expect(onActionMock).toHaveBeenCalledWith({
      type: FormComponentActionType.PatchDataModel,
      payload: { dataModelBinding, value: '' },
    });
  });
});

const renderFormComponent = (props?: Partial<FormComponentProps>): void => {
  render(<FormComponent {...defaultProps} {...props} />);
};
