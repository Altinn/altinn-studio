import React from 'react';
import { TextField } from '@digdir/design-system-react';

interface IRessursTittelInputProps {
    propValueTextField1: string;
    propHandleTextField1Change: (newValue: string) => void;
}

export const RessursTittelInput = ({
    propValueTextField1,
    propHandleTextField1Change,
}: IRessursTittelInputProps ) => {
    return (
        <TextField
            id='tittelInputFelt'
            label='Tittel (norsk bokmål)'
            value={propValueTextField1}
            onChange={ (event) => propHandleTextField1Change(event.target.value) }    
        />
    )
}