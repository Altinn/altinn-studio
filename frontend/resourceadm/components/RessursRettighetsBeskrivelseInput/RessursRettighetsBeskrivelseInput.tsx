import React from 'react';
import { TextField } from '@digdir/design-system-react';

interface IRessursRettighetsBeskrivelseInputProps {
    propValueTextField3: string;
    propHandleTextField3Change: (newValue: string) => void;
}

export const RessursRettighetsBeskrivelseInput = ({
    propValueTextField3,
    propHandleTextField3Change,

}: IRessursRettighetsBeskrivelseInputProps ) => {
    return (
        <TextField
            id='rettighetsBeskrivelseInputFelt'
            label='Rettighetsbeskrivelse (norsk bokmål)'
            value={propValueTextField3}
            onChange={ (event) => propHandleTextField3Change(event.target.value) }    
        />
    )
}