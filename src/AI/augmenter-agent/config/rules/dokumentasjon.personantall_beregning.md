# Beregning av personantall fra godkjent firma

## Vurdering
Sjekk om det er vedlagt beregning av maksimalt personantall (utført av godkjent firma) for lokalet.

* Vedlegg som ser ut til å være personantall-beregning er lastet opp: **vurdert_ok**.
* Ingen vedlegg, men lokalet er et etablert spisested (f.eks. inneholder "restaurant" i stedsnavn): **maa_undersokes**. Skriv at beregning sannsynligvis finnes i kommunens systemer (P360/byggesak) — sjekk der først. Nevn antall deltakere fra søknaden.
* Ingen vedlegg og ukjent lokale-type: **maa_undersokes**. Be om dokumentasjon.

Bruk `count_attachments`, `path_value` for `FlatData.Arrangement.Arrangementssted.StedsNavn` og `FlatData.Arrangement.AntallDeltakere`, og `text_contains_any` på stedsnavn med ["restaurant","kro","pub","spisested"].
