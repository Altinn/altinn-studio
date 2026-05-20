# Riktig søknadstype valgt

## Vurdering
Søknadstypen i `BevillingsType` skal stemme overens med det faktiske arrangementet i `Arrangement.ArrangementType` og varigheten.

* `BevillingsType` er "arrangement" og arrangementstypen er et tydelig enkelt-arrangement (julebord, firmafest, bryllup, konsert): **vurdert_ok**. Bekreft i merknad.
* Det er mismatch (f.eks. type "arrangement" men det beskrives som fast skjenkebevilling): **maa_undersokes**. Beskriv inkonsistensen.
* Felter mangler: **maa_undersokes**.

Bruk `path_value` for å hente `FlatData.BevillingsType` og `FlatData.Arrangement.ArrangementType`.
