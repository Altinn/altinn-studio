### Default button

```jsx
<AltinnButton
  btnText='Altinn button with some text'
/>
```

### Disabled button

```js
<AltinnButton
  btnText='Disabled button'
  disabled={true}
/>
```

### Secondary button

```js
<AltinnButton
  btnText='Secondary button'
  secondaryButton={true}
/>
```

### Click function

Altinn button supports onClickFunction via the onClickFunction prop.

```jsx
const myFunc = () => {
  console.log('My Function');
}
<AltinnButton
  btnText='Button with onClickFunction'
  onClickFunction={myFunc}
/>
```

### Styling

Altinn button also supports Material-UI class objects (classes.someObject) passed via the optional className prop.

```jsx static
<AltinnButton
  btnText='Secondary button'
  className={classes.someClassObject}
/>
```
