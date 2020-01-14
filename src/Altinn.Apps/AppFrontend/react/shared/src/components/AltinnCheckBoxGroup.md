### Row

```jsx
import AltinnCheckBox from './AltinnCheckBox';

<AltinnCheckBoxGroup row={true}>
  <AltinnCheckBox checked={true}/>
  <AltinnCheckBox checked={false}/>
  <AltinnCheckBox checked={true}/>
</AltinnCheckBoxGroup>
```

### Column

```jsx
import AltinnCheckBox from './AltinnCheckBox';
<AltinnCheckBoxGroup row={false}>
  <AltinnCheckBox checked={true}/>
  <AltinnCheckBox checked={false}/>
  <AltinnCheckBox checked={true}/>
</AltinnCheckBoxGroup>
```

### Using FormControlLabel

```jsx
import AltinnCheckBox from './AltinnCheckBox';
import AltinnFormControlLabel from './AltinnFormControlLabel';
<AltinnCheckBoxGroup row={true}>
  <AltinnFormControlLabel
    label={'Pizza'}
    control={<AltinnCheckBox checked={true}/>}
  />
  <AltinnFormControlLabel
    label={'Hamburger'}
    control={<AltinnCheckBox checked={false}/>}
  />
</AltinnCheckBoxGroup>
```
