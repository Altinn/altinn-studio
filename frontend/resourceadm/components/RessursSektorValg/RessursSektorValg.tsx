import React from 'react';
import { Select } from '@digdir/design-system-react';

// Ordet Valg er her kortversjon av nedtrekksmeny
// Dette er andre nedtrekksmeny fra toppen, derav tallet 2 i props
// Basert på /frontend/dashboard/components/ServiceOwnerSelector.tsx
// som er brukt i /frontend/dashboard/pages/CreateService

// mulig at value her bør types til number
interface IRessursSektorValgProps {
    propValueValg1: string;
    propHandleValg1Change: (newValue: string) => void;
}

// Denne er for options array, se Storyboard Docs for Select komponent
interface SingleSelectOption {
    value: string,
    label: string,
}

export const RessursSektorValg = ({
    propValueValg1,
    propHandleValg1Change,

}: IRessursSektorValgProps ) => {

    // Hardkoder mulige valg foreløpig: må også håndtere leting etter 
    // digdir@design-system-react krever Type for options array
    const ressursSektorValg: SingleSelectOption[] = [
        {
            value: "Alarm",
            label: "Alarm"
        }, 
        {
            value: "Fugl",
            label: "Fugl"
        }, 
        {
            value: "Fisk",
            label: "Fisk"
        },
    ];

    // Vet ikke ennå hvordan props kan omsettes til valgt verdi nedtrekksmeny

    // Storyboard "dokumentasjonen" sier at inputId er bare en unik id
    // Jeg tror "options" er en array, men Storyboard sier at den har 
    // en egen type. Inni er en "value" som onChange kan bruke som parameter
    // ---> mulig dette er bare et index tall for en array?

    // options type består av et objekt { value: X, label: Y, }
    // og kan også ha formatedLabel og keywords "liste"

    // forstår ikke helt onChange i Select så jeg kopierer fra ServiceOwnerSelector slik:
    // tror value: string blir da sendt opp til parent component og State der...
    const handleChange = (value:string) => propHandleValg1Change(value);

    return (
        <Select
            inputId='ressursSektorValgFelt'
            label='Sektor (norsk bokmål)'
            options={ressursSektorValg}
            value={propValueValg1}
            onChange={ handleChange }    
        />
    )
}