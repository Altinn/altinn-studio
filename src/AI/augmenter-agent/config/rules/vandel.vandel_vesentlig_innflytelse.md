# Vandel OK – personer med vesentlig innflytelse

## Hjemmel
Alkoholloven § 1-7b: også personer med vesentlig innflytelse på virksomheten (eiere, styremedlemmer, lignende) skal vandelsvurderes.

## Vurdering
Sjekk listene over juridiske og fysiske personer med vesentlig innflytelse.

* `BrukerType` er "person" OG begge lister (`JuridiskePersoner`, `FysiskePersoner`) er tomme: **ikke_relevant**. Skriv at søker er privatperson uten andre personer med vesentlig innflytelse — ingen andre å vurdere.
* Det finnes personer i listen(e): **ikke_vurdert**. Avventer uttalelser fra politi og Skatteetaten for de aktuelle personene. Nevn antallet.
* Listene mangler: **maa_undersokes**.

Bruk `path_value` for `FlatData.BrukerType`, `FlatData.PersonerMedInnflytelse.JuridiskePersoner`, `FlatData.PersonerMedInnflytelse.FysiskePersoner`.
