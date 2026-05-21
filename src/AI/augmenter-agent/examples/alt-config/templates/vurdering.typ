// HR-vurdering av permisjonssøknad — minimal template (alt-config demo)
#let d = json("data.json")

#let status-ikon(s) = {
  if s == "vurdert_ok" {
    text(fill: rgb("#16a34a"), weight: "bold")[✔ OK]
  } else if s == "vurdert_avslag" {
    text(fill: rgb("#dc2626"), weight: "bold")[✘ Avslag]
  } else if s == "maa_undersokes" {
    text(fill: rgb("#d97706"), weight: "bold")[⚠ Undersøk]
  } else if s == "ikke_relevant" {
    text(fill: rgb("#6b7280"))[– N/A]
  } else {
    text(fill: rgb("#6b7280"))[○ Ikke vurdert]
  }
}

#set page(paper: "a4", margin: 2cm)
#set text(font: "Noto Sans", size: 11pt, lang: "nb")

#text(size: 18pt, weight: "bold")[HR-vurdering av permisjonssøknad]
#v(0.4em)
#text(fill: rgb("#6b7280"))[Vurderingsdato: #d.meta.vurderingsdato · Type: #d.meta.permisjonstype]

#v(0.6em)
- *Søker:* #d.soker.navn (ansattnr. #d.soker.ansattnummer)
- *Søknadsdato:* #d.meta.soeknadsdato

#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#cbd5e1"))
#v(0.6em)

#for (seksjon-id, seksjon) in d.sjekkliste [
  == #seksjon.label

  #for (punkt-id, punkt) in seksjon.punkter [
    + *#punkt.label* — #status-ikon(punkt.status)
      #if punkt.merknad != "" [
        \ #text(size: 9.5pt, fill: rgb("#6b7280"), style: "italic")[#punkt.merknad]
      ]
  ]

  #v(0.4em)
]
