### 1 attachment

```jsx
const attachments = [
  {
    name: 'attachment.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
];

instanceMetadataObject = {
  'Dato sendt': '01.01.2020 / 12:21',
  'Avsender': '01017512345-Ola Privatperson',
  'Mottaker': 'matsgm',
  'Referansenummer': '82cb396c-c9b9-4bb2-9826-6ff9a04f1cca'
};

 const pdf = [{
  name: 'InnsendtSkjema.pdf',
  iconClass: 'reg reg-attachment',
  url: 'http://url.til.skjema/fil.pdf',
}];

  <ReceiptComponent
    title='Du har sendt inn ...'
    attachments={attachments}
    collapsibleTitle='Vedlegg'
    instanceMetadataObject={instanceMetadataObject}
    subtitle='Kopi av din kvittering er sendt til din innboks'
    subtitleurl='http://url.til/innboks'
    pdf={pdf}
    body={`Det er gjennomført en maskinell kontroll under utfylling, men vi tar forbehold
    om at det kan bli oppdaget feil under saksbehandlingen og at annen
    dokumentasjon kan være nødvendig. Vennligst oppgi referansenummer ved
    eventuell henvendelser til etaten.`}
    titleSubmitted='Følgende er sendt inn'
  />

```

### 5 attachments (will be collapsed)

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
  {
    name: 'attachment3.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
  {
    name: 'attachment4.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
  {
    name: 'attachment5.doc',
    url: 'http://link.to/attachment.doc',
    iconClass: 'reg reg-attachment',
  },
];

instanceMetadataObject = {
  'Dato sendt': '01.01.2020 / 12:21',
  'Avsender': '01017512345-Ola Privatperson',
  'Mottaker': 'matsgm',
  'Referansenummer': '82cb396c-c9b9-4bb2-9826-6ff9a04f1cca'
};

 const pdf = [{
  name: 'InnsendtSkjema.pdf',
  iconClass: 'reg reg-attachment',
  url: 'http://url.til.skjema/fil.pdf',
}];

  <ReceiptComponent
    title='Du har sendt inn ...'
    attachments={attachments}
    collapsibleTitle='Vedlegg'
    instanceMetadataObject={instanceMetadataObject}
    subtitle='Kopi av din kvittering er sendt til din innboks'
    subtitleurl='http://url.til/innboks'
    pdf={pdf}
    body={`Det er gjennomført en maskinell kontroll under utfylling, men vi tar forbehold
    om at det kan bli oppdaget feil under saksbehandlingen og at annen
    dokumentasjon kan være nødvendig. Vennligst oppgi referansenummer ved
    eventuell henvendelser til etaten.`}
    titleSubmitted='Følgende er sendt inn'
  />

```
