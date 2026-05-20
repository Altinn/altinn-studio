# Arbeidsavtale for styrer

## Vurdering
Arbeidsavtale på serveringsstedet kreves når styrer er ansatt der. For enkeltbevilling/arrangement hvor søker selv er styrer for sitt eget arrangement, er dette ikke relevant.

* `BevillingsType` er "arrangement" og søker er identisk med styrer (eller søker er privatperson som driver eget arrangement): **ikke_relevant**. Skriv at arbeidsavtale ikke kreves for enkeltbevilling der søker er styrer for eget arrangement.
* `BevillingsType` er fast bevilling og arbeidsavtale-vedlegg finnes: **vurdert_ok**.
* Fast bevilling uten arbeidsavtale-vedlegg: **maa_undersokes**.

Bruk `path_value` for `FlatData.BevillingsType` og styrer/søker-data, og evt. `count_attachments`.
