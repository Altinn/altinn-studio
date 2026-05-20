# Innenfor 90 dagers saksbehandlingsfrist

## Hjemmel
Forskrift om omsetning av alkoholholdig drikk: saksbehandlingstid på inntil 90 dager.

## Vurdering
Sjekk om det er tilstrekkelig tid mellom vedtaksdato (i dag) og arrangementets startdato.

* Det er ≥ 90 dager mellom dagens dato og arrangementets startdato: **vurdert_ok**. Bekreft datoene og antall dager i merknad.
* Det er mindre enn 90 dager: **maa_undersokes**. Skriv at fristen er kort — saken bør prioriteres.
* Datoer mangler: **maa_undersokes**.

Bruk `path_value` for `FlatData.Arrangement.ArrangementPeriode[0].StartDato`, og `days_between(today, start)`. For dagens dato kan du bruke den oppgitte vurderingsdatoen om den finnes, eller forklare i merknad at saksbehandler må sjekke selv (vi har ikke et "today"-tool).
