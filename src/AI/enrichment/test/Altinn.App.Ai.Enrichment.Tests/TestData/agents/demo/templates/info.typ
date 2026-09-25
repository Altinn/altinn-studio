// Typst-mal for demo-agenten: enkel oppsummering av en rombooking-forespørsel.
// Datagrunnlaget leses fra data.json (skrevet av mapping-pdf-steget).

#let data = json("data.json")

#set page(paper: "a4", margin: (top: 25mm, bottom: 25mm, left: 25mm, right: 25mm))
#set text(size: 11pt, lang: "nb")
#set par(leading: 0.65em)

#text(size: 14pt, weight: "bold")[Bookingforespørsel]
#v(1em)

*Dato:* #data.meta.dato \
*Behandlet av:* #data.meta.saksbehandler \
*Søker:* #data.soker.navn

#v(0.5em)

*Rom:* #data.booking.rom \
*Når:* #data.booking.dato kl. #data.booking.start til #data.booking.slutt \
*Formål:* #data.booking.formaal

== Vedlegg

#if data.vedlegg.len() == 0 [
  Ingen vedlegg.
] else [
  #for v in data.vedlegg [
    - #v
  ]
]
