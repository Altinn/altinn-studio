```ts
import { StyledSelect } from './TypeSelect';
function onChange(id, value) {
  alert(`Selected type ${value} for ${id}`);
}

<StyledSelect id='sometype' itemType='string' onChange={onChange}/>
```
