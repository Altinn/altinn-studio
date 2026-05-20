# Arrangement innenfor maks 14 dager

## Hjemmel
Alkoholloven § 1-6: enkeltbevilling kan gis for arrangementer av begrenset varighet, normalt opp til 14 dager.

## Vurdering
Sjekk arrangementets varighet (antall dager mellom start- og sluttdato).

* Varighet ≤ 14 dager: **vurdert_ok**. Bekreft start, slutt og antall dager i merknad.
* Varighet > 14 dager: **vurdert_avslag**. Sitér tidsrommet og lovens grense.
* Datoer mangler: **maa_undersokes**.

Bruk `path_value` for `FlatData.Arrangement.ArrangementPeriode[0].StartDato` og `SluttDato`, og `days_between` for å beregne varigheten.
