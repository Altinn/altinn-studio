# Ikke idrettsarrangement eller arrangement for barn/unge

## Hjemmel
Alkoholloven § 8-9: bevilling skal ikke gis til idrettsarrangementer eller arrangementer rettet mot barn og unge.

## Vurdering
Sjekk arrangementets type og deltakere.

* Arrangementstypen er en kjent voksen-aktivitet (julebord, firmafest, bryllup, konsert, jubileum) ELLER `TypeDeltakere` er "bestemtePersoner" (lukket): **vurdert_ok**. Bekreft i merknad. Nevn antall deltakere.
* Arrangementstypen indikerer idrettsarrangement eller barn/unge-arrangement: **vurdert_avslag**. Sitér hjemmelen.
* Ukjent eller manglende: **maa_undersokes**.

Bruk `path_value` for `FlatData.Arrangement.ArrangementType` og `FlatData.Arrangement.TypeDeltakere`. Bruk `text_matches_any` for å sjekke om typen er i listen ["julebord","firmafest","bryllup","konsert","jubileum"].
