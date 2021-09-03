import 'jest';
import shouldSelectPreferredOption
  from '../../../../features/dataModelling/functions/shouldSelectPreferredOption';
import { IMetadataOption } from '../../../../features/dataModelling/functions/types';

describe('>>> shouldSelectPreferredOption.ts', () => {
  const options = [{
    label: 'something',
    value: {
      repositoryRelativeUrl: '/some/relative/path/to/something.schema.json',
      fileName: 'something.schema.json',
    },
  }, {
    label: 'somethingElse',
    value: {
      repositoryRelativeUrl: '/some/relative/path/to/somethingElse.schema.json',
      fileName: 'somethingElse.schema.json',
    },
  }];
  let selectedOption: IMetadataOption = null;
  const changeMetadataFunction = jest.fn();
  const setSelectedOption = (option: IMetadataOption) => {
    changeMetadataFunction(option);
    selectedOption = option;
  };
  beforeEach(() => {
    selectedOption = null;
    changeMetadataFunction.mockReset();
  });
  it('should return true if there there is a selected option', () => {
    selectedOption = options[1];
    expect(shouldSelectPreferredOption(options, selectedOption, setSelectedOption)).toBe(true);
  });
  it('should return false if there are no options', () => {
    expect(shouldSelectPreferredOption([], null, setSelectedOption)).toBe(false);
  });
  it('should return false and set the selectedOption to first if there is no selected option', () => {
    expect(shouldSelectPreferredOption(options, null, setSelectedOption)).toBe(false);
    expect(changeMetadataFunction).toHaveBeenCalledTimes(1);
    expect(changeMetadataFunction).toHaveBeenCalledWith(options[0]);
    expect(selectedOption).toBe(options[0]);
  });
  it('should return false and not change the selected option if the selected option has no value', () => {
    selectedOption = { label: 'creating' };
    expect(shouldSelectPreferredOption([], selectedOption, setSelectedOption)).toBe(false);
    expect(selectedOption).toStrictEqual({ label: 'creating' });
    expect(shouldSelectPreferredOption(options, selectedOption, setSelectedOption)).toBe(false);
    expect(changeMetadataFunction).toHaveBeenCalledTimes(0);
    expect(selectedOption).not.toBe(options[0]);
    expect(selectedOption).toStrictEqual({ label: 'creating' });
  });
  it('should return false and change the selected option if label is in options', () => {
    selectedOption = { label: 'somethingElse' };
    expect(shouldSelectPreferredOption(options, selectedOption, setSelectedOption)).toBe(false);
    expect(changeMetadataFunction).toHaveBeenCalledTimes(1);
    expect(selectedOption).toBe(options[1]);
  });
  it(
    'should return false and set selected option to null if there are no options and selected option has value',
    () => {
      selectedOption = {
        value: { repositoryRelativeUrl: '/some/url.schema.json', fileName: 'url.schema.json' },
        label: 'non existing schema',
      };
      expect(shouldSelectPreferredOption([], selectedOption, setSelectedOption)).toBe(false);
      expect(changeMetadataFunction).toHaveBeenCalledTimes(1);
      expect(selectedOption).toBeNull();
    },
  );
});
