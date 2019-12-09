### Props description

The props 'hideBackdrop' and 'hideCloseIcon' are used to hide features of the modal. 'hideBackdrop' hides the shadow effect the modal has and 'hideCloseIcon' hides the cross in the header. They are show by default.
The prop 'allowCloseOnBackdropClick' allows or disables the user to click outside of the modal, on the backgdrop to close the modal. This is allowed by default.

### Default modal

```jsx
import Typography from '@material-ui/core/Typography';

function PreviewModal({classes}) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  function toggleModal() {
    setIsModalOpen(!isModalOpen);
  }

  return (
    <>
      <button onClick={toggleModal}>Toggle modal</button>
      <AltinnModal
        classes={null}
        isOpen={isModalOpen}
        onClose={toggleModal}
        headerText={'Header'}
      >
        <Typography>Content</Typography>
      </AltinnModal>
    </>
  )
}
;<PreviewModal/>
```

### Printview "looks like modal"

This variant displays the modal design, without the modal function.

This can be used in "print view" or to be staticly shown without any "Modal function".

```jsx
import Typography from '@material-ui/core/Typography';

function PreviewModal({classes}) {
  return (
    <>
      <AltinnModal
        classes={null}
        isOpen={null}
        onClose={null}
        headerText={'Printview "looks like modal"'}
        printView={true}
      >
        <Typography>Content</Typography>
      </AltinnModal>
    </>
  )
};

<PreviewModal/>
```

### Close button outside modal

Prop: closeButtonOutsideModal === true

```jsx
import Typography from '@material-ui/core/Typography';

function PreviewModal({classes}) {
  return (
    <div style={{backgroundColor: '#1EAEF7', padding: '2rem'}}>
      <AltinnModal
        classes={null}
        isOpen={null}
        onClose={null}
        headerText={'Close button outside modal'}
        printView={true}
        closeButtonOutsideModal={true}
      >
        <Typography>Content</Typography>
      </AltinnModal>
    </div>
  )
};

<PreviewModal/>
```
