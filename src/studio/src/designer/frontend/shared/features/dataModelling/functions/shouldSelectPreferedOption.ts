import { IMetadataOption } from './types';

function shouldSelectPreferedOption(
  metadataOptions: IMetadataOption[],
  selectedOption: IMetadataOption,
  setSelectedOption: (option: IMetadataOption) => void,
) {
  if (!metadataOptions.length // no dataModels
    || !selectedOption // nothing is selected yet
    || (!selectedOption.value && selectedOption.label) // creating new
  ) {
    if (!selectedOption && metadataOptions.length) { // automatically select if no label (on initial load)
      setSelectedOption(metadataOptions[0]);
    } else if (selectedOption?.value) {
      setSelectedOption(null);
    }
    if (selectedOption?.label && !selectedOption.value?.repositoryRelativeUrl) {
      const newOption = metadataOptions.find(
        ({ label }: { label: string }) => label === selectedOption.label,
      );
      if (newOption) { setSelectedOption(newOption); }
    }
    return false;
  }
  return true;
}

export default shouldSelectPreferedOption;
