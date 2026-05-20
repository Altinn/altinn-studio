# Uttalelse innhentet fra NAV (sosialtjenesten)

## Hjemmel
Alkoholloven § 1-7: uttalelse fra NAV innhentes ved søknad om skjenkebevilling.

## Vurdering
Ingen integrasjon mot NAV — uttalelse må innhentes manuelt fra NAV i søknadens kommune.

Statusen skal alltid være: **ikke_vurdert**.

Skriv en merknad som:
* Sier at uttalelse må innhentes fra NAV i den aktuelle kommunen
* Nevner kommunenavnet hvis tilgjengelig (slå opp via `lookup` (med `registry="kommuner"`) på kommunenummeret)

Bruk `path_value` for `FlatData.Kommunenummer` og `lookup` (med `registry="kommuner"`) for navn.
