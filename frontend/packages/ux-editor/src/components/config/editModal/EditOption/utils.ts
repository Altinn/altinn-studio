import type { Option } from 'app-shared/types/Option';

export const setLabel = (option: Option<string>, label: string): Option<string> => ({
  ...option,
  label,
});

export const setDescription = (option: Option<string>, description: string): Option<string> => ({
  ...option,
  description,
});

export const setHelpText = (option: Option<string>, helpText: string): Option<string> => ({
  ...option,
  helpText,
});

export const setValue = (option: Option<string>, value: string): Option<string> => ({
  ...option,
  value,
});

export const deleteDescription = (option: Option<string>): Option<string> => {
  const { description, ...rest } = option;
  return rest;
};

export const deleteHelpText = (option: Option<string>): Option<string> => {
  const { helpText, ...rest } = option;
  return rest;
};
