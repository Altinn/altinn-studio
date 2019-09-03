AltinnCollapsibleAttachments includes a title.
If you want attachments without a title, use AltinnAttachment.

### Collapsible, 2 attachments

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

<AltinnCollapsibleAttachments
  attachments={attachments}
  collapsible={true}
  title='Attachments Title'
/>
```

### Not collapsed, 2 attachments

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

<AltinnCollapsibleAttachments
  attachments={attachments}
  collapsible={false}
  title='Attachments Title'
/>
```