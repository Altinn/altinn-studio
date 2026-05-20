# Registrering hos Mattilsynet

## Vurdering
Sjekk om lokalet er registrert hos Mattilsynet (for spisesteder).

* Lokalet er et etablert spisested (stedsnavn inneholder "restaurant", "kro", "pub" e.l.): **vurdert_ok**. Skriv at det må antas å være registrert; verifiseres via oppslag ved tvil.
* Lokalet er ikke et tydelig spisested (f.eks. forsamlingshus, telt): **ikke_relevant** eller **maa_undersokes** etter skjønn — Mattilsyn-registrering er mest relevant der det serveres mat.
* Felter mangler: **maa_undersokes**.

Bruk `path_value` for `FlatData.Arrangement.Arrangementssted.StedsNavn` og `text_contains_any` med ["restaurant","kro","pub","spisested","gjestgiveri"].
