import React from 'react';
import { TextField } from '@digdir/design-system-react';

interface IRessursBeskrivelseInputProps {
    propValueTextField2: string;
    propHandleTextField2Change: (newValue: string) => void;
}

export const RessursBeskrivelseInput = ({
    propValueTextField2,
    propHandleTextField2Change,

}: IRessursBeskrivelseInputProps ) => {
    return (
        <TextField
            id='beskrivelseInputFelt'
            label='Beskrivelse (norsk bokmål)'
            value={propValueTextField2}
            onChange={ (event) => propHandleTextField2Change(event.target.value) }    
        />
    )
}