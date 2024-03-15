import {
  deleteDescription,
  deleteHelpText,
  setDescription,
  setHelpText,
  setLabel,
  setValue,
} from './utils';

describe('utils', () => {
  describe('setValue', () => {
    it('Sets the value of the option', () => {
      const option = { label: 'label', value: 'old value' };
      const newValue = 'new value';
      const newOption = setValue(option, newValue);
      expect(newOption).toEqual({ ...option, value: newValue });
    });
  });

  describe('setLabel', () => {
    it('Sets the label of the option', () => {
      const option = { label: 'old label', value: 'value' };
      const newLabel = 'new label';
      const newOption = setLabel(option, newLabel);
      expect(newOption).toEqual({ ...option, label: newLabel });
    });
  });

  describe('setDescription', () => {
    it('Updates the description of the option when there is one from before', () => {
      const option = { label: 'label', value: 'value', description: 'old description' };
      const newDescription = 'new description';
      const newOption = setDescription(option, newDescription);
      expect(newOption).toEqual({ ...option, description: newDescription });
    });

    it('Sets the description of the option when there is no description from before', () => {
      const option = { label: 'label', value: 'value' };
      const newDescription = 'new description';
      const newOption = setDescription(option, newDescription);
      expect(newOption).toEqual({ ...option, description: newDescription });
    });
  });

  describe('setHelpText', () => {
    it('Updates the help text of the option when there is one from before', () => {
      const option = { label: 'label', value: 'value', helpText: 'old help text' };
      const newHelpText = 'new help text';
      const newOption = setHelpText(option, newHelpText);
      expect(newOption).toEqual({ ...option, helpText: newHelpText });
    });

    it('Sets the help text of the option when there is no help text from before', () => {
      const option = { label: 'label', value: 'value' };
      const newHelpText = 'new help text';
      const newOption = setHelpText(option, newHelpText);
      expect(newOption).toEqual({ ...option, helpText: newHelpText });
    });
  });

  describe('deleteDescription', () => {
    it('Deletes the description of the option', () => {
      const option = { label: 'label', value: 'value', description: 'description' };
      const newOption = deleteDescription(option);
      expect(newOption).toEqual({ label: 'label', value: 'value' });
    });
  });

  describe('deleteHelpText', () => {
    it('Deletes the help text of the option', () => {
      const option = { label: 'label', value: 'value', helpText: 'help text' };
      const newOption = deleteHelpText(option);
      expect(newOption).toEqual({ label: 'label', value: 'value' });
    });
  });
});
