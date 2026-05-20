# Bevillingsgebyr korrekt beregnet

## Hjemmel
Alkoholforskriften § 6: kommunen fastsetter bevillingsgebyret etter omsatt mengde alkohol. Minstegebyr per arrangement varierer per kommune.

## Vurdering
Gebyrberegningen krever oppslag i kommunens regelverk og er typisk en manuell sjekk av saksbehandler.

Statusen skal alltid være: **maa_undersokes**.

Skriv en merknad som:
* Sier at gebyr må beregnes manuelt etter kommunens satser
* Nevner kommunens navn (slå opp via `lookup` (med `registry="kommuner"`) på kommunenummeret) og at saksbehandler må konsultere kommunens gebyrregulativ

Bruk `path_value` for `FlatData.Kommunenummer` og `lookup` (med `registry="kommuner"`) for navn.
