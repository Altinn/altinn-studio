import React from 'react';
import { Select } from '@digdir/design-system-react';

// Ordet Valg er her kortversjon av nedtrekksmeny
// Dette er tredje nedtrekksmeny fra toppen, derav tallet 3 i rops
// Basert på /frontend/dashboard/components/ServiceOwnerSelector.tsx
// som er brukt i /frontend/dashboard/pages/CreateService

// mulig at value her bør types til number
interface IRessursTypeValgProps {
    propValueValg3: string;
    propHandleValg3Change: (newValue: string) => void;
}

// Denne er for options array, se Storyboard Docs for Select komponent
interface SingleSelectOption {
    value: string,
    label: string,
}

export const RessursTypeValg = ({
    propValueValg3,
    propHandleValg3Change,

}: IRessursTypeValgProps ) => {

    // Hardkoder mulige valg foreløpig: må også håndtere leting etter 
    // digdir@design-system-react krever Type for options array
    const ressursTypeValg: SingleSelectOption[] = [
        {
            value: "MaskinportenSchema",
            label: "MaskinportenSchema"
        }, 
        {
            value: "Alternativ1",
            label: "Alternativ1"
        }, 
        {
            value: "Alternativ2",
            label: "Alternativ2"
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
    const handleChange = (value:string) => propHandleValg3Change(value);

    return (
        <Select
            inputId='ressursTypeValgFelt'
            label='Ressurstype (norsk bokmål)'
            options={ressursTypeValg}
            value={propValueValg3}
            onChange={ handleChange }    
        />
    )
}