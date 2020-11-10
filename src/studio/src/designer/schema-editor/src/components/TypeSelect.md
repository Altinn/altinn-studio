```ts
import { TypeSelect } from './TypeSelect';
function onChange(id, value) {
  alert(`Selected type ${value} for ${id}`);
}

<TypeSelect id='sometype' itemType='string' onChange={onChange}/>
```