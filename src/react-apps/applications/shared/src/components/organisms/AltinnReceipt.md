```jsx
const attachments = [
  {
    name: 'attachment.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
  ];

  <ReceiptComponent
    title='title goes here'
    attachments={attachments}
    instanceMetaDataObject={instanceMetaDataObject(
      props.formConfig,
      props.language,
      props.profile,
      props.route.instanceGuid,
      )}
    subtitle={getLanguageFromKey('receipt_container.subtitle', props.language)}
    subtitleurl='http://some.link'
    pdf={pdf}
    body={getLanguageFromKey('receipt_container.body', props.language)}
    titleSubmitted={getLanguageFromKey('receipt_container.title_submitted', props.language)}
    language={props.language}
  />

```
