import { v4 as uuidv4 } from 'uuid';

import { ALTINN_ROW_ID } from 'src/features/formData/types';

export function getFormDataMockForRepGroup() {
  return {
    someGroup: [
      {
        [ALTINN_ROW_ID]: uuidv4(),
        valueField: 'Value for first',
        labelField: 'Label for first',
      },
      {
        [ALTINN_ROW_ID]: uuidv4(),
        valueField: 'Value for second',
        labelField: 'Label for second',
      },
    ],
  };
}
