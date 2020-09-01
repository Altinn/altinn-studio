### One attachment

```jsx
const attachments = [
  {
    name: 'attachment.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
];
<AltinnAttachment
  attachments={attachments}
  listDisableVerticalPadding={true}
/>
```

### Two attachments, nested

```jsx
const attachments = [
  {
    name: 'attachment1.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
  {
    name: 'attachment2.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
];
<AltinnAttachment
  attachments={attachments}
  listDisableVerticalPadding={false}
  nested={true}
/>
```
