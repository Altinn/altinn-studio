# Søker er identifisert med org.nr.

## Vurdering
For en bevilling kreves det normalt at søker er et selskap med organisasjonsnummer. Enkeltbevilling for lukket arrangement (firmafest, privatfest) kan likevel gis til privatperson.

* Søker har et organisasjonsnummer i `OrganisasjonsInformasjon.Organisasjonsnummer`: **vurdert_ok**. Bekreft org.nr. i merknad.
* `BrukerType` er "person" og det er et enkelt-arrangement (firmafest/privatfest/julebord): **maa_undersokes**. Bekreft at det er et privat/lukket arrangement og at privatperson er riktig bevillingshaver.
* Verken org.nr. eller dokumentert privatperson-grunnlag: **maa_undersokes**.

Bruk `path_value` for `FlatData.BrukerType`, `FlatData.OrganisasjonsInformasjon.Organisasjonsnummer`, og arrangement-detaljer.
