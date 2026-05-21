// Permisjonssøknad — minimal template (alt-config demo)
#let d = json("data.json")

#set page(paper: "a4", margin: 2cm)
#set text(font: "Noto Sans", size: 11pt, lang: "nb")

#text(size: 18pt, weight: "bold")[Permisjonssøknad]
#v(0.4em)
#text(fill: rgb("#6b7280"))[Vurderingsdato: #d.meta.vurderingsdato · Type: #d.meta.permisjonstype]

#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
#v(0.6em)

== Søker
- *Navn:* #d.soker.navn
- *Fødselsnummer:* #d.soker.foedselsnummer
- *Ansattnummer:* #d.soker.ansattnummer
- *Avdeling:* #d.soker.avdeling

== Permisjon
- *Type:* #d.permisjon.type
- *Fra:* #d.permisjon.fra_dato
- *Til:* #d.permisjon.til_dato
- *Begrunnelse:* #d.permisjon.begrunnelse

#if d.stedfortreder != none [
  == Stedfortreder
  - *Navn:* #d.stedfortreder.navn
  - *Ansattnummer:* #d.stedfortreder.ansattnummer
]

#if d.vedlegg.len() > 0 [
  == Vedlegg
  #for v in d.vedlegg [
    - #v.filnavn (#v.type)
  ]
]
