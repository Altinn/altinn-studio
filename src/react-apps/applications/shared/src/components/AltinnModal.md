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
