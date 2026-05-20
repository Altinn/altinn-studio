# Brennevin kun til spisested (hvis gruppe 3)

## Hjemmel
Alkoholloven § 4-2: Bevilling for gruppe 3 (brennevin) kan kun gis til spisesteder med matservering.

## Vurdering
Sjekk varegruppen og arrangementsstedet.

* Det søkes IKKE om gruppe 3 (varegruppen er gruppe 1/2): **ikke_relevant**. Skriv at gruppe 3 ikke er omsøkt.
* Det søkes om gruppe 3 OG stedet er åpenbart spisested (stedsnavn inneholder "restaurant","kro","gjestgiveri","spisested"): **vurdert_ok**. Bekreft.
* Det søkes om gruppe 3, men stedet er ikke åpenbart spisested: **maa_undersokes**. Be om bekreftelse på matservering.

Bruk `path_value` for `FlatData.Arrangement.VaregruppeAlkohol` og `FlatData.Arrangement.Arrangementssted.StedsNavn`. Bruk `text_contains_any` for å detektere spisested og for å sjekke om varegruppen er "gruppeTre" eller inneholder "tre"/"3"/"brennevin".
