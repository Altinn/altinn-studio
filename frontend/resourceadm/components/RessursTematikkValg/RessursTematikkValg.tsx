import React from 'react';
import { Select } from '@digdir/design-system-react';

// Ordet Valg er her kortversjon av nedtrekksmeny
// Dette er andre nedtrekksmeny fra toppen, derav tallet 2 i props
// Basert på /frontend/dashboard/components/ServiceOwnerSelector.tsx
// som er brukt i /frontend/dashboard/pages/CreateService

// mulig at value her bør types til number
interface IRessursTematikkValgProps {
    propValueValg2: string;
    propHandleValg2Change: (newValue: string) => void;
}

// Denne er for options array, se Storyboard Docs for Select komponent
interface SingleSelectOption {
    value: string,
    label: string,
}

export const RessursTematikkValg = ({
    propValueValg2,
    propHandleValg2Change,

}: IRessursTematikkValgProps ) => {

    // Hardkoder mulige valg foreløpig: må også håndtere leting etter 
    // digdir@design-system-react krever Type for options array
    const ressursTematikkValg: SingleSelectOption[] = [
        {
            value: "Area51",
            label: "Area51"
        }, 
        {
            value: "Area52",
            label: "Area52"
        }, 
        {
            value: "ArcticUFObase",
            label: "ArcticUFObase"
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
    const handleChange = (value:string) => propHandleValg2Change(value);

    return (
        <Select
            inputId='ressursTematikkValgFelt'
            label='Tematisk Område (norsk bokmål)'
            options={ressursTematikkValg}
            value={propValueValg2}
            onChange={ handleChange }    
        />
    )
}