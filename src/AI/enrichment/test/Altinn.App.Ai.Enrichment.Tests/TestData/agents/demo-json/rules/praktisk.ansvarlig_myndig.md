# Ansvarlig person er myndig

Hent `Ansvarlig.Foedselsnummer` (bruk `path_value`) og beregn alder med
`age_from_id` (decoder `fnr-no`) per i dag (`current_date`). 18 år eller
eldre gir `vurdert_ok`; under 18 gir `vurdert_avslag`; ugyldig nummer gir
`maa_undersokes`.
