import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import AltinnFormControlLabel from 'app-shared/components/AltinnFormControlLabel';
import * as React from 'react';
import { IPartyTypesAllowed, PartyTypes } from '../containers/AccessControlContainer';

export interface IPartyTypeComponentProps {
  partyTypeKey: string;
  partyTypeValue: PartyTypes;
  partyTypesAllowed: IPartyTypesAllowed
  handlePartyTypesAllowedChange: (partyType: PartyTypes) => void;
  label: string;
}

export function PartyTypeComponent(props: any) {
  const {
    partyTypeKey,
    partyTypeValue,
    partyTypesAllowed,
    handlePartyTypesAllowedChange,
    label,
  } = props;

  const handleChange = () => {
    handlePartyTypesAllowedChange(partyTypeValue);
  };

  return (
    <AltinnFormControlLabel
      key={partyTypeKey}
      control={<AltinnCheckBox
        checked={partyTypesAllowed ? partyTypesAllowed[partyTypeValue] : false}
        // eslint-disable-next-line react/jsx-no-bind
        onChangeFunction={handleChange}
      />}
      label={label}
    />);
}
