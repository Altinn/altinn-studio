# Riktig kommune valgt

## Vurdering
Sjekk at oppgitt kommunenummer er et gyldig kommunenummer som denne saksbehandlerløsningen håndterer, og at arrangementsstedet ligger i den kommunen.

* Kommunenummeret slår opp til et kjent kommunenavn, og arrangementsstedet (adresse/poststed) er konsistent med kommunen: **vurdert_ok**. Bekreft kommunenummer, navn, og at stedet ligger der.
* Kommunenummeret er ukjent: **maa_undersokes**. Skriv at det må verifiseres.

Bruk `path_value` for å hente `FlatData.Kommunenummer` og `FlatData.Arrangement.Arrangementssted`. Bruk `lookup_kommune` for navn-oppslag.
