import { screen } from '@testing-library/react';
import type { RequiredSwitchProps } from './RequiredSwitch';
import { RequiredSwitch } from './RequiredSwitch';
import { renderWithProviders } from '../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { fieldNode1Mock, uiSchemaNodesMock } from '../../../test/mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';

const user = userEvent.setup();

const defaultProps: RequiredSwitchProps = {
  schemaPointer: fieldNode1Mock.schemaPointer,
  isRequired: fieldNode1Mock.isRequired,
};
const saveDataModel = jest.fn();

describe('RequiredSwitch', () => {
  afterEach(jest.clearAllMocks);

  it('Saves the model when the required checkbox is checked', async () => {
    renderRequiredSwitch();
    await user.click(screen.getByRole('checkbox'));
    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });

  it('Saves the model when the required checkbox is unchecked', async () => {
    renderRequiredSwitch({ isRequired: true });
    await user.click(screen.getByRole('checkbox'));
    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });
});

const renderRequiredSwitch = (props?: Partial<RequiredSwitchProps>) =>
  renderWithProviders({
    appContextProps: { schemaModel: SchemaModel.fromArray(uiSchemaNodesMock), save: saveDataModel },
  })(<RequiredSwitch {...defaultProps} {...props} />);
