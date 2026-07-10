// Typst-mal for demo-agenten: sjekkliste med verdicts fra orkestratoren.
// Datagrunnlaget leses fra data.json (mapper-envelope + aggregerte verdicts).

#let data = json("data.json")

#set page(paper: "a4", margin: (top: 25mm, bottom: 25mm, left: 25mm, right: 25mm))
#set text(size: 11pt, lang: "nb")
#set par(leading: 0.65em)

#let statusfarge(status) = {
  if status == "vurdert_ok" { rgb("#2e7d32") }
  else if status == "vurdert_avslag" { rgb("#c62828") }
  else if status == "maa_undersokes" { rgb("#ef6c00") }
  else { rgb("#616161") }
}

#text(size: 14pt, weight: "bold")[Sjekkliste — rombooking]
#v(0.5em)

*Vurderingsdato:* #data.meta.dato \
*Søker:* #data.soker.navn

#for (secId, sec) in data.sjekkliste.pairs() [
  == #sec.label
  #for (punktId, punkt) in sec.punkter.pairs() [
    #block(inset: (left: 4pt), spacing: 8pt)[
      *#punkt.label* #h(6pt) #text(fill: statusfarge(punkt.status), weight: "bold")[#punkt.status] \
      #text(size: 10pt)[#punkt.merknad]
    ]
  ]
]
