# Tidsrom innenfor åpningstid

Åpningstiden er 08:00–21:00, og en booking kan maksimalt vare 4 timer.
Hent `Booking.StartTid` og `Booking.SluttTid` (bruk `path_value`).
Sjekk vinduet med `time_within_window` og varigheten med `hours_between_times`.
Begge vilkår oppfylt gir `vurdert_ok`; brudd gir `vurdert_avslag`.
