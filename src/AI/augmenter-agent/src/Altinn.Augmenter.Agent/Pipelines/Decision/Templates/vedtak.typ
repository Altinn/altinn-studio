// =============================================================================
// Vedtaksbrev – serverings-, skjenke-, salgs- og enkeltbevilling
//
// Bruk:  typst compile vedtak.typ --input data=vedtak-innvilgelse.json
//        python: typst.compile("vedtak.typ", sys_inputs={"data": "filnavn.json"})
//
// Én mal for alle vedtakstyper. JSON-data styrer hvilke seksjoner som vises.
// =============================================================================

#let d = json("data.json")

// ---------------------------------------------------------------------------
// Hjelpefunksjoner
// ---------------------------------------------------------------------------

#let har(obj, nøkkel) = {
  if type(obj) == dictionary { nøkkel in obj and obj.at(nøkkel) != none } else { false }
}

#let hent(obj, nøkkel, standard: "") = {
  if type(obj) == dictionary and nøkkel in obj {
    let val = obj.at(nøkkel)
    if type(val) == str { val } else if type(val) == int or type(val) == float { str(val) } else { standard }
  } else { standard }
}

#let er-innvilgelse = d.vedtak.utfall == "innvilgelse"
#let er-avslag      = d.vedtak.utfall == "avslag"
#let btype          = d.vedtak.bevillingstype

// Søker-identifikasjon: med org.nr. hvis tilgjengelig, ellers bare navn
#let orgnr = hent(d.soker, "organisasjonsnummer")
#let soker-tekst = if orgnr != "" { d.soker.firmanavn + " (org.nr. " + orgnr + ")" } else { d.soker.firmanavn }

// Norske betegnelser – oppslag via dictionary for å sikre streng-type
#let btype-map = (
  serveringsbevilling: "serveringsbevilling",
  skjenkebevilling: "skjenkebevilling",
  salgsbevilling: "salgsbevilling",
  enkeltbevilling: "skjenkebevilling for enkelt anledning",
  utvidelse_skjenke: "utvidelse av skjenkebevilling",
)
#let bevillingstype-tekst = btype-map.at(btype, default: btype)

#let sted-tekst = {
  if "sted" in d and type(d.sted) == dictionary and "navn" in d.sted { d.sted.navn }
  else if "arrangement" in d and type(d.arrangement) == dictionary and "navn" in d.arrangement { d.arrangement.navn }
  else { "" }
}

// Lovnavn
#let alkoholloven = "lov om omsetning av alkoholholdig drikk m.v. av 2. juni 1989 nr. 27"
#let serveringsloven-ref = "lov om serveringsvirksomhet av 13. juni 1997 nr. 55"

// Alkoholgruppe-tekst
#let alkoholgruppe-tekst = {
  let g = hent(d.vedtak, "alkoholgruppe")
  if g == "gruppe_1" { "alkoholholdig drikk gruppe 1 med høyst 4,7 volumprosent alkohol" }
  else if g == "gruppe_1_2" { "alkoholholdig drikk gruppe 1 og 2 med mindre enn 22 volumprosent alkohol" }
  else if g == "gruppe_1_2_3" { "all alkoholholdig drikk (gruppe 1, 2 og 3) med høyst 60 volumprosent alkohol" }
  else { "alkoholholdig drikk" }
}

#let alkoholgruppe-kort = {
  let g = hent(d.vedtak, "alkoholgruppe")
  if g == "gruppe_1" { "inntil 4,7" }
  else if g == "gruppe_1_2" { "inntil 22" }
  else if g == "gruppe_1_2_3" { "inntil 60" }
  else { "" }
}

// ---------------------------------------------------------------------------
// Sideoppsett – formelt brev
// ---------------------------------------------------------------------------

#set page(
  paper: "a4",
  margin: (top: 3cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
  footer: context {
    set text(size: 8pt, fill: rgb("#666"))
    line(length: 100%, stroke: 0.4pt + rgb("#ccc"))
    v(0.3em)
    grid(
      columns: (1fr, 1fr),
      [#d.meta.kommune kommune],
      align(right)[Side #counter(page).display() av #counter(page).final().first()],
    )
  },
)

#set text(font: "Noto Sans", size: 10.5pt, lang: "nb")
#set par(leading: 0.65em, justify: true)
#show heading: set text(font: "Noto Sans")

// ---------------------------------------------------------------------------
// Brevhode
// ---------------------------------------------------------------------------

#text(size: 14pt, weight: "bold")[#d.meta.kommune kommune]
#v(0.2em)
#text(size: 9pt, fill: rgb("#555"))[
  Enhet for næring og forvaltning
]

#v(2em)

// ---------------------------------------------------------------------------
// Tittel
// ---------------------------------------------------------------------------

#{
  let soker-id = {
    let orgnr = hent(d.soker, "organisasjonsnummer")
    if orgnr != "" { d.soker.firmanavn + ", org.nr. " + orgnr } else { d.soker.firmanavn }
  }
  let tittel = if er-innvilgelse and btype == "enkeltbevilling" {
    "Vedtak om innvilgelse av enkeltbevilling – " + soker-id
  } else if er-innvilgelse and btype == "utvidelse_skjenke" {
    "Vedtak om utvidelse av skjenkebevilling – " + soker-id + " – " + hent(d.arrangement, "navn")
  } else if er-innvilgelse {
    "Vedtak om innvilgelse av " + bevillingstype-tekst + " – " + soker-id + " – " + sted-tekst
  } else {
    "Vedtak om avslag på søknad om " + bevillingstype-tekst + " – " + soker-id + " – " + sted-tekst
  }
  heading(level: 1, text(size: 13pt)[#tittel])
}

#v(1em)

// ===================================================
// VEDTAKSDEL
// ===================================================

#text[#d.meta.kommune kommune har i dag truffet følgende vedtak:]

#v(0.6em)

// ---------------------------------------------------------------------------
// INNVILGELSE
// ---------------------------------------------------------------------------

#if er-innvilgelse {

  // --- Enkeltbevilling ---
  if btype == "enkeltbevilling" {
    let arr = d.arrangement
    enum(
      [#soker-tekst gis skjenkebevilling for #alkoholgruppe-tekst i forbindelse med #arr.type «#arr.navn» på #d.sted.navn (#d.sted.adresse).],
      [Skjenketiden er fra #arr.fra_dato kl. #arr.fra_klokkeslett til og med #arr.til_dato kl. #arr.til_klokkeslett.],
      [Det er ikke adgang til å medbringe eller nyte medbrakt alkoholholdig drikk under arrangementet, jf. alkoholloven § 1-3 andre ledd.],
      [#d.styrer.navn godkjennes som styrer for skjenkebevillingen.],
      if har(d, "stedfortreder") and har(d.stedfortreder, "navn") {
        [#d.stedfortreder.navn godkjennes som stedfortreder for skjenkebevillingen.]
      } else {
        [Det er innvilget fritak fra kravet om stedfortreder.]
      },
      [Vedtaket er fattet med hjemmel i alkoholloven §§ 1-6 andre ledd, 1-7, 1-7c første ledd og § 4-2 første og andre ledd.],
    )

    v(0.5em)
    text[Forventet antall deltakere er #str(arr.antall_deltakere).]

  // --- Utvidelse skjenke ---
  } else if btype == "utvidelse_skjenke" {
    let arr = d.arrangement
    enum(
      [#soker-tekst gis utvidelse av skjenkebevillingen til å gjelde #d.sted.navn (#d.sted.adresse) for #alkoholgruppe-tekst, fra #arr.fra_dato kl. #arr.fra_klokkeslett til og med #arr.til_dato kl. #arr.til_klokkeslett.],
      [Det er ikke adgang til å medbringe eller nyte medbrakt alkoholholdig drikk, jf. alkoholloven § 1-3 andre ledd.],
      [Utvidelsen gjelder i tillegg til eksisterende alminnelig skjenkebevilling.],
    )
    v(0.5em)
    text[Forventet antall deltakere er #str(arr.antall_deltakere).]

  // --- Serveringsbevilling ---
  } else if btype == "serveringsbevilling" {
    enum(
      [#soker-tekst gis serveringsbevilling for #d.sted.navn, #d.sted.adresse, med virkning fra #d.vedtak.bevillingsperiode.fra_dato.],
      [Serveringsstedets åpningstider er #hent(d.vedtak, "apningstider", standard: "06.00–02.30 alle dager").],
      [#d.daglig_leder.navn godkjennes som daglig leder for serveringsstedet.],
      [Serveringsstedets kapasitet er #str(d.sted.personkapasitet_inne) personer inne#if har(d.sted, "personkapasitet_ute") [ og #str(d.sted.personkapasitet_ute) personer ute].],
      [Vedtaket er fattet med hjemmel i serveringsloven § 3 (#serveringsloven-ref).],
    )

  // --- Salgsbevilling ---
  } else if btype == "salgsbevilling" {
    enum(
      [#soker-tekst gis salgsbevilling for alkoholholdig drikk gruppe 1 (2,5–4,7 volumprosent) for #d.sted.navn, #d.sted.adresse, fra #d.vedtak.bevillingsperiode.fra_dato til og med #d.vedtak.bevillingsperiode.til_dato.],
      [#d.styrer.navn godkjennes som styrer for salgsbevillingen.],
      if har(d, "stedfortreder") and har(d.stedfortreder, "navn") {
        [#d.stedfortreder.navn godkjennes som stedfortreder for salgsbevillingen.]
      } else {
        [Det er innvilget fritak fra kravet om stedfortreder.]
      },
      [Salgstider: mandag–fredag #d.vedtak.salgstider.hverdager, lørdager og dager før helligdager #d.vedtak.salgstider.loerdager. Ikke salg på søn- og helligdager, 1. mai og 17. mai.],
      [Vedtaket er fattet med hjemmel i alkoholloven §§ 1-6 andre ledd, 1-7 og 1-7c første ledd, samt § 3-1 andre ledd.],
    )

  // --- Fast skjenkebevilling ---
  } else if btype == "skjenkebevilling" {
    text[#soker-tekst gis skjenkebevilling for #alkoholgruppe-tekst for #d.sted.navn, #d.sted.adresse, med virkning fra #d.vedtak.bevillingsperiode.fra_dato til og med #d.vedtak.bevillingsperiode.til_dato.]
    v(0.4em)

    if har(d.vedtak, "skjenketider") {
      text[Skjenketider inne og ute:]
      v(0.2em)
      if har(d.vedtak.skjenketider, "gruppe_1_2") {
        list([Gruppe 1 og 2: #d.vedtak.skjenketider.gruppe_1_2])
      }
      if har(d.vedtak.skjenketider, "gruppe_3") {
        list([Gruppe 3 (brennevin): #d.vedtak.skjenketider.gruppe_3])
      }
      v(0.2em)
      text[Konsum av utskjenket alkoholholdig drikk må opphøre senest 30 minutter etter skjenketidens utløp, jf. alkoholloven § 4-4 sjette ledd.]
      v(0.4em)
    }

    text[#d.styrer.navn godkjennes som styrer og #d.stedfortreder.navn som stedfortreder for skjenkebevillingen.]
    v(0.4em)

    text[Bevillingens kapasitet er #str(d.sted.personkapasitet_inne) personer inne#if har(d.sted, "personkapasitet_ute") [ og #str(d.sted.personkapasitet_ute) personer ute].]
    v(0.4em)

    text[Vedtaket er fattet med hjemmel i alkoholloven §§ 1-6 andre ledd, 1-7, 1-7c første ledd og § 4-2 første og andre ledd, samt retningslinjer for salgs- og skjenkebevillinger i #d.meta.kommune kommune.]
  }

  // --- Uttalelser (innvilgelse) ---
  v(0.8em)
  if har(d, "uttalelser") {
    let u = d.uttalelser
    let instanser = ()
    if har(u, "politi") { instanser.push("politiet") }
    if har(u, "skatteetaten") { instanser.push("Skatteetaten") }
    if har(u, "nav") { instanser.push("NAV (sosialtjenesten)") }
    if instanser.len() > 0 {
      text[Før vedtaket ble truffet har kommunen innhentet uttalelse fra #instanser.join(", ", last: " og "). Ingen av høringsinstansene har hatt merknader til søknaden.]
      v(0.5em)
    }
  }

  // --- Uteservering (betinget) ---
  if har(d, "uteservering") and d.uteservering.inkluder {
    heading(level: 2)[Uteservering]
    text[Det er gitt skjenkebevilling også for uteserveringsarealet. Bevillingshaver har dokumentert lovlig adgang til arealet. Skjenkearealet ute skal være klart avgrenset mot ikke-skjenkeareal.]
    if har(d.uteservering, "areal") { v(0.3em); text[#d.uteservering.areal] }
    if har(d.uteservering, "godkjenning") { v(0.3em); text[#d.uteservering.godkjenning] }
    v(0.5em)
  }

  // --- Vilkår (betinget) ---
  if har(d, "vilkaar") and d.vilkaar.len() > 0 {
    heading(level: 2)[Vilkår]
    text[Følgende vilkår er satt for bevillingen, jf. alkoholloven § 4-3:]
    v(0.3em)
    for v in d.vilkaar {
      list([#v.tekst#if har(v, "hjemmel") [ (#v.hjemmel)]])
    }
    v(0.5em)
  }

  // --- Bevillingshavers ansvar ---
  heading(level: 2)[Bevillingshavers ansvar]

  if btype == "serveringsbevilling" {
    text[Bevillingshaver plikter å drive serveringsstedet i samsvar med bevillingsvedtaket, serveringsloven og gjeldende forskrifter. Serveringsstedet skal til enhver tid ha en daglig leder som oppfyller kravene i serveringsloven § 4.]
    v(0.4em)
    text[Bevillingshaver plikter å melde fra til kommunen ved endring av daglig leder, eiersammensetning, lokasjon eller driftskonsept, jf. serveringsloven § 14.]
  } else {
    text[Bevillingshaver plikter å drive virksomheten i samsvar med bevillingsvedtaket, alkoholloven og gjeldende forskrifter. Det er bevillingshavers ansvar å sørge for at driften til enhver tid skjer innenfor rammene av bevillingen.]
    v(0.4em)
    if btype != "enkeltbevilling" and btype != "utvidelse_skjenke" {
      text[Bevillingshaver plikter å melde fra til kommunen ved endring av styrer eller stedfortreder, jf. alkoholloven § 1-7c annet ledd, og ved endring i eiersammensetningen, jf. alkoholloven § 1-10 første ledd.]
      v(0.4em)
    }
    text[Det er ikke adgang til å medbringe eller nyte medbrakt alkoholholdig drikk på stedet, jf. alkoholloven § 1-3 andre ledd.]
  }

  // --- Gebyr (betinget) ---
  if har(d, "gebyr") {
    v(0.5em)
    heading(level: 2)[Gebyr]
    text[Bevillingsgebyr: kr #str(d.gebyr.bevillingsgebyr)]
    if har(d.gebyr, "administrasjonsgebyr") and d.gebyr.administrasjonsgebyr > 0 {
      text[, og administrasjonsgebyr: kr #str(d.gebyr.administrasjonsgebyr)]
    }
    text[. Totalt: kr #str(d.gebyr.totalt). Gebyr faktureres til oppgitt fakturaadresse.]
    if har(d.gebyr, "krever_omsetningsoppgave") and d.gebyr.krever_omsetningsoppgave {
      v(0.3em)
      text[Bevillingshaver plikter å rapportere omsatt mengde alkohol i liter innen 14 dager etter arrangementet.]
    }
  }
}

// ---------------------------------------------------------------------------
// AVSLAG
// ---------------------------------------------------------------------------

#if er-avslag {

  // Vedtaksformulering
  if btype == "serveringsbevilling" {
    text[Søknad fra #soker-tekst om serveringsbevilling for #d.sted.navn, #d.sted.adresse, avslås med hjemmel i #hent(d, "avslagshjemmel", standard: "serveringsloven § 6").]
  } else if btype == "skjenkebevilling" or btype == "enkeltbevilling" {
    text[Søknad fra #soker-tekst om #bevillingstype-tekst for #sted-tekst avslås med hjemmel i #hent(d, "avslagshjemmel", standard: "alkoholloven § 1-7b").]
  } else {
    text[Søknad fra #soker-tekst om #bevillingstype-tekst avslås med hjemmel i #hent(d, "avslagshjemmel", standard: "alkoholloven § 1-7b").]
  }

  // --- Bakgrunn ---
  v(0.8em)
  heading(level: 2)[Bakgrunn]
  text[#d.meta.kommune kommune mottok #d.meta.soknadsdato søknad fra #d.soker.firmanavn om #bevillingstype-tekst for #sted-tekst.]
  v(0.4em)
  if har(d, "vurdering") and har(d.vurdering, "bakgrunn") {
    text[#d.vurdering.bakgrunn]
    v(0.4em)
  }
  if har(d, "soker") and har(d.soker, "eiersammensetning") {
    text[#d.soker.eiersammensetning]
  }

  // --- Lovverk ---
  v(0.8em)
  heading(level: 2)[Lovverk]

  if btype == "serveringsbevilling" {
    text[Det følger av serveringsloven § 3 at den som vil gjøre seg næring av å drive serveringssted, må ha serveringsbevilling. Bevilling _skal_ gis dersom kravene i §§ 4–6 er oppfylt.]
    v(0.4em)
    text[Etter serveringsloven § 6 kreves det uklanderlig vandel i forhold til straffelovgivningen, skatte- og avgiftslovgivningen og regnskapslovgivningen for bevillingshaver og personer med vesentlig innflytelse på virksomheten.]
    v(0.4em)
    text[I Ot.prp. nr. 55 (1996–1997) punkt 7 er det angitt tre vurderingskriterier: lovbruddets grovhet, hvor langt tilbake i tid forholdet ligger, og antall overtredelser. Forhold eldre enn 5 år kan normalt ikke vektlegges.]
  } else {
    text[Det følger av alkoholloven § 1-7b at bevillingshaver og personer med vesentlig innflytelse på virksomheten må ha utvist uklanderlig vandel i forhold til alkohollovgivningen og bestemmelser i annen lovgivning som har sammenheng med alkohollovens formål, samt skatte-, avgifts- og regnskapslovgivningen.]
    v(0.4em)
    text[For styrer og stedfortreder kan det etter alkoholloven § 1-7c kun vektlegges vandel i forhold til alkohollovgivningen.]
    v(0.4em)
    text[I Ot.prp. nr. 7 (1996–1997) er det angitt tre vurderingskriterier: lovbruddets grovhet, hvor langt tilbake i tid forholdet ligger, og antall overtredelser. Det er gjerningstidspunktet som er avgjørende. Forhold eldre enn 10 år kan normalt ikke vektlegges.]
    if har(d, "vurdering") and har(d.vurdering, "lokalpolitisk") {
      v(0.4em)
      text[Etter alkoholloven § 1-7a kan kommunen blant annet legge vekt på antall salgs- og skjenkesteder, stedets karakter, beliggenhet, målgruppe, trafikk- og ordensmessige forhold, næringsinteresser og hensynet til alminnelig ro og orden.]
    }
  }

  // --- Uttalelser ---
  v(0.8em)
  heading(level: 2)[Uttalelser]
  if har(d, "uttalelser") {
    let u = d.uttalelser
    if har(u, "politi") {
      text[*Agder politidistrikt* opplyste #u.politi.dato:]
      v(0.2em)
      block(inset: (left: 1.5em))[_#u.politi.beskrivelse _]
      v(0.4em)
    }
    if har(u, "skatteetaten") {
      text[*Skatteetaten* opplyste #u.skatteetaten.dato:]
      v(0.2em)
      block(inset: (left: 1.5em))[_#u.skatteetaten.beskrivelse _]
      v(0.4em)
    }
    if har(u, "nav") {
      text[*NAV (sosialtjenesten)* opplyste #u.nav.dato:]
      v(0.2em)
      block(inset: (left: 1.5em))[_#u.nav.beskrivelse _]
      v(0.4em)
    }
  }

  // --- Vurdering ---
  v(0.5em)
  heading(level: 2)[Vurdering]
  if har(d, "vurdering") and har(d.vurdering, "vandel") {
    text[#d.vurdering.vandel]
    v(0.4em)
  }

  // Vesentlig innflytelse (betinget)
  if har(d, "vurdering") and har(d.vurdering, "vesentlig_innflytelse") and d.vurdering.vesentlig_innflytelse.inkluder {
    heading(level: 3)[Vurdering – vesentlig innflytelse]
    text[#d.vurdering.vesentlig_innflytelse.person anses å ha vesentlig innflytelse på virksomheten.]
    v(0.3em)
    text[#d.vurdering.vesentlig_innflytelse.vurdering]
    v(0.4em)
  }

  // Lokalpolitisk (betinget)
  if har(d, "vurdering") and har(d.vurdering, "lokalpolitisk") {
    heading(level: 3)[Lokalpolitisk vurdering]
    text[#d.vurdering.lokalpolitisk]
    v(0.4em)
  }

  // Konklusjon
  if har(d, "vurdering") and har(d.vurdering, "samlet_konklusjon") {
    text(weight: "medium")[#d.vurdering.samlet_konklusjon]
    v(0.4em)
  }
}

// ===================================================
// KLAGE (alltid med)
// ===================================================

#v(0.8em)
#heading(level: 2)[Klage]

#text[Dette vedtaket er et enkeltvedtak som kan påklages, jf. forvaltningsloven § 59. Klagefristen er #str(d.klage.klagefrist_uker) uker fra den dagen vedtaket er mottatt.]

#v(0.3em)

#text[En eventuell klage sendes til #d.meta.kommune kommune, som vil vurdere saken på nytt. Dersom kommunen opprettholder vedtaket, sendes klagen videre til #d.klage.klageinstans for endelig avgjørelse.]

#v(0.3em)

#text[Klage sendes til: #d.klage.kommune_epost]

// ===================================================
// VEDLEGG (betinget)
// ===================================================

#if har(d, "vedlegg") and d.vedlegg.len() > 0 {
  v(0.8em)
  heading(level: 2)[Vedlegg]
  for v in d.vedlegg {
    list([#v])
  }
}

// ===================================================
// SIGNATUR
// ===================================================

#v(2em)

#text[Med vennlig hilsen]
#v(1.5em)

#grid(
  columns: (1fr, 1fr),
  [
    #line(length: 70%, stroke: 0.5pt)
    #v(0.2em)
    #text(size: 9pt)[Saksbehandler]
  ],
  [
    #line(length: 70%, stroke: 0.5pt)
    #v(0.2em)
    #text(size: 9pt)[Enhetsleder]
  ],
)
