# Beliggenhet i tråd med retningslinjer

## Vurdering
Kommunens lokale retningslinjer kan begrense skjenkebevilling basert på arrangementsstedets beliggenhet (avstand fra skoler, barnehager, kirker, idrettsanlegg, m.v.). Disse retningslinjene varierer per kommune og kan ikke avgjøres uten kunnskap om kommunens eget regelverk.

Statusen skal alltid være: **maa_undersokes**.

Skriv en merknad som:
* Sier at saksbehandler må vurdere beliggenheten konkret mot kommunens lokale retningslinjer
* Nevner stedsnavn og adresse fra søknaden
* Nevner kommunen (slå opp via `lookup` (med `registry="kommuner"`) på kommunenummer)

Bruk `path_value` for `FlatData.Arrangement.Arrangementssted` og `FlatData.Kommunenummer`, og `lookup` (med `registry="kommuner"`) for navn.
