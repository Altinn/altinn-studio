// =============================================================================
// Sjekkliste for vurdering av bevilling søknad
// Vennesla / Kristiansand kommune
//
// Bruk:  typst compile sjekkliste.typ --input data=eksempel.json
//        (eller via Python: typst.compile("sjekkliste.typ", sys_inputs={"data": "eksempel.json"}))
// =============================================================================

#let d = json("data.json")

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

#let status-ikon(s) = {
  if s == "vurdert_ok" {
    text(fill: rgb("#16a34a"), weight: "bold")[✔ Støtter innvilgelse]
  } else if s == "vurdert_avslag" {
    text(fill: rgb("#dc2626"), weight: "bold")[✘ Støtter avslag]
  } else if s == "maa_undersokes" {
    text(fill: rgb("#d97706"), weight: "bold")[⚠ Må undersøkes]
  } else if s == "ikke_relevant" {
    text(fill: rgb("#6b7280"))[– Ikke relevant]
  } else {
    text(fill: rgb("#6b7280"))[○ Ikke vurdert]
  }
}

#let status-farge(s) = {
  if s == "vurdert_ok" { rgb("#f0fdf4") }
  else if s == "vurdert_avslag" { rgb("#fef2f2") }
  else if s == "maa_undersokes" { rgb("#fffbeb") }
  else { rgb("#f9fafb") }
}

// ---------------------------------------------------------------------------
// Sideoppsett
// ---------------------------------------------------------------------------

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2cm, right: 2cm),
  header: context {
    if counter(page).get().first() > 1 {
      set text(size: 8pt, fill: rgb("#9ca3af"))
      grid(
        columns: (1fr, 1fr),
        align(left)[Sjekkliste – #d.meta.saksnummer],
        align(right)[Side #counter(page).display() av #counter(page).final().first()],
      )
      line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
    }
  },
  footer: {
    set text(size: 7pt, fill: rgb("#9ca3af"))
    align(center)[Generert #d.meta.vurderingsdato · #d.meta.saksbehandler]
  },
)

#set text(font: "Noto Sans", size: 9.5pt, lang: "nb")
#set par(leading: 0.6em)

// ---------------------------------------------------------------------------
// Tittelside / toppseksjon
// ---------------------------------------------------------------------------

#align(center)[
  #block(width: 100%, inset: 1.2em, fill: rgb("#1e3a5f"), radius: 4pt)[
    #set text(fill: white)
    #text(size: 18pt, weight: "bold")[Sjekkliste for behandling av søknad]
    #v(0.3em)
    #text(size: 11pt)[#d.bevilling.type_bevilling]
  ]
]

#v(0.8em)

// ---------------------------------------------------------------------------
// Saksinformasjon
// ---------------------------------------------------------------------------

#block(width: 100%, inset: 1em, fill: rgb("#f1f5f9"), radius: 3pt, stroke: 0.5pt + rgb("#cbd5e1"))[
  #grid(
    columns: (1fr, 1fr),
    gutter: 0.8em,
    [
      #text(weight: "bold", size: 8pt, fill: rgb("#64748b"))[SAKSNUMMER] \
      #text(size: 10pt)[#d.meta.saksnummer]
    ],
    [
      #text(weight: "bold", size: 8pt, fill: rgb("#64748b"))[SØKNADSDATO] \
      #text(size: 10pt)[#d.meta.soknadsdato]
    ],
    [
      #text(weight: "bold", size: 8pt, fill: rgb("#64748b"))[SØKER] \
      #text(size: 10pt)[#d.soker.navn (#d.soker.organisasjonsnummer)]
    ],
    [
      #text(weight: "bold", size: 8pt, fill: rgb("#64748b"))[KOMMUNE] \
      #text(size: 10pt)[#d.meta.kommune]
    ],
  )
]

#v(0.3em)

// Arrangement-info (kun hvis det finnes)
#if "arrangement" in d {
  block(width: 100%, inset: 1em, fill: rgb("#fefce8"), radius: 3pt, stroke: 0.5pt + rgb("#fde68a"))[
    #text(weight: "bold", size: 8pt, fill: rgb("#92400e"))[ARRANGEMENT] \
    #v(0.2em)
    #grid(
      columns: (1fr, 1fr),
      gutter: 0.5em,
      [*Navn:* #d.arrangement.navn],
      [*Type:* #d.arrangement.type],
      [*Periode:* #d.arrangement.fra_dato kl. #d.arrangement.fra_klokkeslett – #d.arrangement.til_dato kl. #d.arrangement.til_klokkeslett],
      [*Deltakere:* #str(d.arrangement.antall_deltakere) (#d.arrangement.aapen_eller_lukket)],
      [*Lokale:* #d.arrangement.lokale_navn],
      [*Sted:* #d.arrangement.innendors_utendors],
    )
  ]
  v(0.3em)
}

// Bevilling-info
#block(width: 100%, inset: 1em, fill: rgb("#eff6ff"), radius: 3pt, stroke: 0.5pt + rgb("#bfdbfe"))[
  #grid(
    columns: (1fr, 1fr, 1fr),
    gutter: 0.5em,
    [*Alkoholgruppe:* #d.bevilling.alkoholgruppe],
    [*Styrer:* #d.styrer.navn],
    [*Stedfortreder:* #d.stedfortreder.navn],
  )
]

#v(1em)

// ---------------------------------------------------------------------------
// Statistikk-oppsummering
// ---------------------------------------------------------------------------

#{
  let teller = (vurdert_ok: 0, vurdert_avslag: 0, maa_undersokes: 0, ikke_vurdert: 0, ikke_relevant: 0)
  for (seksjon-id, seksjon) in d.sjekkliste {
    for (punkt-id, punkt) in seksjon.punkter {
      let s = punkt.status
      if s == "vurdert_ok" { teller.vurdert_ok += 1 }
      else if s == "vurdert_avslag" { teller.vurdert_avslag += 1 }
      else if s == "maa_undersokes" { teller.maa_undersokes += 1 }
      else if s == "ikke_relevant" { teller.ikke_relevant += 1 }
      else { teller.ikke_vurdert += 1 }
    }
  }
  let totalt = teller.vurdert_ok + teller.vurdert_avslag + teller.maa_undersokes + teller.ikke_vurdert + teller.ikke_relevant

  block(width: 100%, inset: 0.8em, fill: rgb("#f8fafc"), radius: 3pt, stroke: 0.5pt + rgb("#e2e8f0"))[
    #text(weight: "bold", size: 10pt)[Oppsummering: #totalt kontrollpunkter]
    #v(0.3em)
    #grid(
      columns: (1fr, 1fr, 1fr, 1fr, 1fr),
      gutter: 0.4em,
      align(center)[
        #text(size: 18pt, fill: rgb("#16a34a"), weight: "bold")[#teller.vurdert_ok] \
        #text(size: 7pt)[Støtter \ innvilgelse]
      ],
      align(center)[
        #text(size: 18pt, fill: rgb("#dc2626"), weight: "bold")[#teller.vurdert_avslag] \
        #text(size: 7pt)[Støtter \ avslag]
      ],
      align(center)[
        #text(size: 18pt, fill: rgb("#d97706"), weight: "bold")[#teller.maa_undersokes] \
        #text(size: 7pt)[Må \ undersøkes]
      ],
      align(center)[
        #text(size: 18pt, fill: rgb("#6b7280"), weight: "bold")[#teller.ikke_vurdert] \
        #text(size: 7pt)[Ikke \ vurdert]
      ],
      align(center)[
        #text(size: 18pt, fill: rgb("#9ca3af"), weight: "bold")[#teller.ikke_relevant] \
        #text(size: 7pt)[Ikke \ relevant]
      ],
    )
  ]
}

#v(1em)

// ---------------------------------------------------------------------------
// Sjekkliste-seksjoner
// ---------------------------------------------------------------------------

#let seksjon-nr = counter("seksjon")

#for (seksjon-id, seksjon) in d.sjekkliste {
  // Hopp over seksjoner merket som ikke-relevante
  let vis = if "relevant" in seksjon { seksjon.relevant } else { true }
  if vis {
    seksjon-nr.step()

    // Seksjonstittel
    block(width: 100%, inset: (x: 0.6em, y: 0.4em), fill: rgb("#1e3a5f"), radius: (top: 3pt))[
      #text(fill: white, weight: "bold", size: 10pt)[
        #context seksjon-nr.display(). #seksjon.label
      ]
    ]

    // Tabell for punkter
    block(width: 100%, stroke: 0.5pt + rgb("#cbd5e1"), radius: (bottom: 3pt))[
      #for (punkt-id, punkt) in seksjon.punkter {
        let bg = status-farge(punkt.status)
        block(width: 100%, inset: (x: 0.6em, y: 0.45em), fill: bg, below: 0pt, above: 0pt)[
          #grid(
            columns: (55%, 25%, 20%),
            gutter: 0.3em,
            [
              #text(weight: "medium")[#punkt.label]
              #if punkt.merknad != "" {
                linebreak()
                text(size: 8pt, fill: rgb("#6b7280"), style: "italic")[#punkt.merknad]
              }
            ],
            align(right)[#status-ikon(punkt.status)],
            [],
          )
        ]
        line(length: 100%, stroke: 0.3pt + rgb("#e5e7eb"))
      }
    ]

    v(0.8em)
  }
}

// ---------------------------------------------------------------------------
// Tegnforklaring
// ---------------------------------------------------------------------------

#v(1em)
#line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
#v(0.3em)

#text(size: 8pt, fill: rgb("#6b7280"))[
  *Tegnforklaring:*
  #h(1em) #text(fill: rgb("#16a34a"))[✔] Vurdert – støtter innvilgelse
  #h(1em) #text(fill: rgb("#dc2626"))[✘] Vurdert – støtter avslag
  #h(1em) #text(fill: rgb("#d97706"))[⚠] Må undersøkes
  #h(1em) ○ Ikke vurdert
  #h(1em) – Ikke relevant
]

#v(0.3em)
#text(size: 7.5pt, fill: rgb("#9ca3af"))[
  *Hjemler:* Alkoholloven §§ 1-6, 1-7, 1-7a, 1-7b, 1-7c, 4-2, 4-3, 4-4 · Serveringsloven §§ 3, 4, 6 · Forvaltningsloven §§ 6, 11, 57, 59 · Alkoholforskriften kap. 6, 10
]
