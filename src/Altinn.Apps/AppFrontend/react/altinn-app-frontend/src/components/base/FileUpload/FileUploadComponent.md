Simple `FileUploadComponent`

```tsx
import { nb } from '../../shared/resources/language/texts/nb';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

const createStore = configureStore();

const initialState = {
  attachments: {
    attachments: {}
  }
};

const mockStore = createStore(initialState);

<Provider store={mockStore}>
  <FileUploadComponent
    displayMode={'simple'}
    id={'simpleFileUploadComponent'}
    isValid={true}
    language={nb()}
    maxFileSizeInMB={25}
    maxNumberOfAttachments={1}
    minNumberOfAttachments={0}
    readOnly={false}
  />
</Provider>
```
