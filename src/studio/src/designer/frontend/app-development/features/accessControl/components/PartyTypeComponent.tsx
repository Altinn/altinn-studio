import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import AltinnFormControlLabel from 'app-shared/components/AltinnFormControlLabel';
import React from 'react';
import type { IPartyTypesAllowed } from '../containers/AccessControlContainer';
import { PartyTypes } from '../containers/AccessControlContainer';

interface IPartyTypeComponentProps {
  partyTypeKey: string;
  partyTypeValue: PartyTypes;
  partyTypesAllowed: IPartyTypesAllowed;
  handlePartyTypesAllowedChange: (partyType: PartyTypes) => void;
  label: string;
}

export const PartyTypeComponent = ({
  partyTypeKey,
  partyTypeValue,
  partyTypesAllowed,
  handlePartyTypesAllowedChange,
  label,
}: IPartyTypeComponentProps) => {
  const handleChange = () => {
    handlePartyTypesAllowedChange(partyTypeValue);
  };

  return (
    <AltinnFormControlLabel
      key={partyTypeKey}
      control={
        <AltinnCheckBox
          checked={
            partyTypesAllowed ? partyTypesAllowed[partyTypeValue] : false
          }
          onChangeFunction={handleChange}
        />
      }
      label={label}
    />
  );
};
