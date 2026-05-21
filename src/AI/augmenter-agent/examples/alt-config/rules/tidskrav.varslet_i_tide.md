# Søknaden er sendt minst 14 dager før permisjonsstart

## Hjemmel
Internt HR-regelverk: planlagt permisjon (ferie, studie, velferd) krever minst 14 kalenderdagers varsel.
Foreldrepermisjon og sykefraværsoppfølging er unntatt fra varslingskravet.

## Vurdering
1. Hvis `Permisjonstype` er `foreldrepermisjon` eller `sykefravar`: **ikke_relevant**.
2. Ellers: beregn antall dager mellom `Soeknadsdato` og `Permisjonsperiode.StartDato`.
   * 14 dager eller mer: **vurdert_ok**. Skriv merknad med dager-antall.
   * Færre enn 14 dager: **vurdert_avslag**. Skriv merknad med dager-antall og minimumskravet.
   * Mangler en av datoene: **maa_undersokes**.

Bruk `days_between` for å beregne dagene — ikke gjett.
