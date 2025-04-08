export type NewSubformProps = {
  subformName: string;
  dataModelName: string;
};

type IsSaveButtonDisabledProps = {
  newSubform: NewSubformProps;
  subformError: string;
  dataModelError: string;
};

export const isSaveButtonDisabled = ({
  newSubform,
  subformError,
  dataModelError,
}: IsSaveButtonDisabledProps) => {
  const { subformName, dataModelName } = newSubform;
  const inputsAreEmpty = subformName === '' || dataModelName === '';
  const inputsAreInvalid = subformError !== '' || dataModelError !== '';

  return inputsAreEmpty || inputsAreInvalid;
};
