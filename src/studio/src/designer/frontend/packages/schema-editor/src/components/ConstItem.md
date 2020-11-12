ConstItem example
```js
import ConstItem from './ConstItem';
const item = {
  name: 'dataFormatProvider',
  id: '#/definitions/root/properties/dataFormatProvider',
  fields: [
    {key: 'const', value: 'SERES'},
    {key: 'type', value: 'string'},
    {key: '@xsdType', value: 'XmlAttribute'},
  ],
};
<ConstItem item={item}/>
```