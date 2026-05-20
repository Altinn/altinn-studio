# Fritak fra krav om stedfortreder vurdert

## Hjemmel
Alkoholloven § 1-7c: kommunen kan i enkelte tilfeller frita fra kravet om stedfortreder.

## Vurdering
Sjekk om stedfortreder er oppgitt i søknaden, og om søker har bedt om fritak.

* Stedfortreder er oppgitt OG `SkalHaFritakFraStedfortreder` er false: **ikke_relevant**. Skriv at stedfortreder er oppgitt og fritak ikke er aktuelt. Nevn stedfortreders navn.
* Stedfortreder er IKKE oppgitt OG `SkalHaFritakFraStedfortreder` er true: **maa_undersokes**. Skriv at fritaket må vurderes konkret.
* Stedfortreder mangler og ikke bedt om fritak: **maa_undersokes**.

Bruk `path_value` for `FlatData.Bevillingsansvarlig.Stedfortreder` og `FlatData.Bevillingsansvarlig.SkalHaFritakFraStedfortreder`.
