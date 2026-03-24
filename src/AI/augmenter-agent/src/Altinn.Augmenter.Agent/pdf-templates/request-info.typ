// =============================================================================
// Typst-mal: Forespørsel om opplysninger
// Brukes til vandelsvurdering ved saksbehandling av bevillingssøknader.
//
// Datagrunnlaget leses fra en JSON-fil (se schema: data-schema.json).
// Kompiler med:  typst compile foresporsel-om-opplysninger.typ --input data=data.json
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Les JSON-datagrunnlag
// ---------------------------------------------------------------------------
#let data = json(sys.inputs.at("data", default: "data.json"))

// ---------------------------------------------------------------------------
// 2. Sidesett (A4, Calibri, norske marginer lik originaldokumentet)
// ---------------------------------------------------------------------------
#set page(
  paper: "a4",
  margin: (top: 25mm, bottom: 25mm, left: 25mm, right: 25mm),
)
#set text(font: "Calibri", size: 11pt, lang: "nb")
#set par(leading: 0.65em, spacing: 0.65em)

// ---------------------------------------------------------------------------
// 3. Hjelpefunksjoner
// ---------------------------------------------------------------------------

/// Formater dato fra ISO-streng (YYYY-MM-DD) til norsk format (DD.MM.YYYY)
#let norsk-dato(iso) = {
  let deler = iso.split("-")
  if deler.len() == 3 {
    deler.at(2) + "." + deler.at(1) + "." + deler.at(0)
  } else {
    iso
  }
}

/// Vis et nøkkel-verdi-par på én linje
#let felt(label, verdi) = {
  [*#label* #verdi]
}

// ---------------------------------------------------------------------------
// 4. Dokument-innhold
// ---------------------------------------------------------------------------

// Tittel
#text(size: 12pt, weight: "bold")[Forespørsel om opplysninger]

#v(0.5em)

// Innledningstekst
Vi ber om uttalelse med opplysninger av betydning for vandelsvurdering
til saksbehandling av bevillingssøknad.

#v(0.5em)

// Overskrift for tabellen
*Liste over personer og selskaper vi ønsker uttalelse om:*

// ---------------------------------------------------------------------------
// 5. Tabell med involverte personer/selskaper
// ---------------------------------------------------------------------------
#let header-fill = rgb("#9FE6FF")

#table(
  columns: (28fr, 46fr, 26fr),
  inset: 6pt,
  stroke: 0.5pt + luma(180),

  // Header-rad
  table.cell(fill: header-fill)[Rolle],
  table.cell(fill: header-fill)[Navn på personer og selskaper som har vesentlig innflytelse på virksomheten],
  table.cell(fill: header-fill)[Fødselsnummer (11 siffer) eller org.nr (9 siffer)],

  // Dynamiske rader fra datagrunnlaget
  ..data.personer.map(p => (
    p.rolle,
    p.navn,
    p.id,
  )).flatten()
)

#v(0.5em)

// ---------------------------------------------------------------------------
// 6. Metadata-felter
// ---------------------------------------------------------------------------

#felt("Type sak:", data.type-sak)

#v(0.3em)

#felt(
  "Skjenkested, salgssted, serveringssted:",
  data.sted.navn + ", " + data.sted.adresse,
)

#v(0.3em)

#if data.at("arrangementsdato", default: none) != none {
  felt("Arrangementsdato:", norsk-dato(data.arrangementsdato))
  v(0.3em)
}

// ---------------------------------------------------------------------------
// 7. Lovhenvisninger
// ---------------------------------------------------------------------------

*Lovhenvisninger:*

#for lov in data.lovhenvisninger {
  list.item[#lov]
}

#v(0.5em)

// ---------------------------------------------------------------------------
// 8. Vedlegg
// ---------------------------------------------------------------------------

#if data.at("vedlegg", default: ()).len() == 0 {
  [Ingen vedlegg]
} else {
  [*Vedlegg:*]
  for v in data.vedlegg {
    list.item[#v]
  }
}
