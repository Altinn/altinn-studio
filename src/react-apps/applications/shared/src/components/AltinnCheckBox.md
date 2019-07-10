### Default

```jsx
let checked = true;
const myFunction = () => {
  checked = !checked;
}
<AltinnCheckBox
  checked={this.checked}
  onChangeFunction={this.myFunction}
/>
```

### Disabled

```jsx
<AltinnCheckBox
  checked={true}
  disabled={true}
/>
```

### onChange

Altinn Check Box supports onClick via the onClickFunction prop.

```jsx
const myFunction = () => {
  alert('My function');
}
<AltinnCheckBox
  checked={true}
  onChangeFunction={myFunction}
/>
```
