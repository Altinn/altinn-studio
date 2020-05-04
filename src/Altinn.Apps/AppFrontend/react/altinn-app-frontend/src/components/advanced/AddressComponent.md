Address component: `simplified = true`

```tsx
import {nb} from '../../shared/resources/language/languages';
import {getTextResource} from '../../utils/formComponentUtils';
const dummyFunc = () => {return;}

<AddressComponent
  id={'simpleAddressComponent'}
  formData={{
    address: 'Example road',
    zipCode: '0550',
    houseNumber: '1',
  }}
  handleDataChange={dummyFunc}
  getTextResource={getTextResource}
  isValid={true}
  simplified={true}
  dataModelBindings={{
    address: 'address',
    zipCode: 'zipCode',
    houseNumber: 'houseNumber',
  }}
  readOnly={false}
  required={false}
  language={nb()}
  textResourceBindings={{
    address: 'Address',
    zipCode: 'Zip code',
    houseNumber: 'House number',
  }}

/>
```

Address component: `simplified = false`

```tsx
import {nb} from '../../shared/resources/language/languages';
import {getTextResource} from '../../utils/formComponentUtils';
const dummyFunc = () => {return;}

<AddressComponent
  id={'complexAddressComponent'}
  formData={{
    address: 'Example road',
    zipCode: '0550',
    houseNumber: '1',
  }}
  handleDataChange={dummyFunc}
  getTextResource={getTextResource}
  isValid={true}
  simplified={false}
  dataModelBindings={{
    address: 'address',
    zipCode: 'zipCode',
    houseNumber: 'houseNumber',
  }}
  readOnly={false}
  required={false}
  language={nb()}
  textResourceBindings={{
    address: 'Address',
    zipCode: 'Zip code',
    houseNumber: 'House number',
  }}

/>
```