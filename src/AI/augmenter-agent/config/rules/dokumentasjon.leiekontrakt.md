# Leiekontrakt for lokalet

## Vurdering
Søker må kunne dokumentere disponering av lokalet. For enkeltbevilling/arrangement holder det normalt med en bekreftelse fra lokaleier (ikke full leiekontrakt).

* Det er vedlagt et dokument som ser ut til å være leiekontrakt eller bekreftelse fra lokaleier (sjekk filnavn på vedlegg): **vurdert_ok**.
* Ingen vedlegg er lastet opp, men bevillingstypen er "arrangement": **maa_undersokes**. Be om bekreftelse fra lokaleier (nevn stedsnavn).
* Ingen vedlegg og ikke "arrangement"-bevilling: **maa_undersokes** (be om full leiekontrakt).

Bruk `count_attachments` (valgfritt med filter) for å sjekke vedlegg, og `path_value` for `FlatData.BevillingsType` og `FlatData.Arrangement.Arrangementssted.StedsNavn`.
