Altinn.studio har nådd første milepæl for MVP, og tjenesteutviklere (spesielt for pilottjenestene) er velkommen til å ta løsningen i bruk for å lage tjenester som skal settes i produksjon på et senere tidspunkt. Merk at det kan oppstå situasjoner der vi må gjøre endringer som knekker tjenestene (breaking changes). Vi vil i så fall forklare hvordan man kommer seg rundt situasjonen.

Det er noen kjente feil og svakheter i løsningen.

## Større svakheter

- Vi har nylig gjort endringer som knekker tjenestene. Se [beskrivelse av breaking changes](https://docs.altinn.studio/known-issues/breaking-changes/) for å finne ut hva du må gjøre for å få dem til å virke igjen.
- Løsningen er ennå ikke optimalisert for tastaturnavigasjon eller bruk av touchskjermer.
- Enkelte funksjonaliteter har vesentlige feil som ikke vil bli rettet innenfor MVP. Vi anbefaler at myke valideringer og datovelgeren *ikke* tas i bruk i en produksjonssatt tjeneste før disse feilene er rettet.
- Dagens app-struktur vil endres innen kort tid for å optimalisere for lokal utvikling. Vi anbefaler at man *ikke* setter i gang utvikling av tjenester som planlegges produksjonssatt før denne endringen er gjort. (For pilotene vil Altinn bidra med konvertering i overgangen til ny struktur.)

## Mindre svakheter som er verdt å nevne

- Dersom du sletter en dynamikkregel fra regelfila uten å ha fjernet alle betingede renderingtilkoblinger som benytter regelen vil UI-editor kræsje. Sørg derfor for å slette alle tilkoblinger før du sletter regelen.
- Det er mulig å legge til komponenter for kort svar og langt svar uten en ledetekst. Komponenten vil i slike tilfeller se rar ut og ikke være i tråd med UU-krav.
- Det er mulig å endre på (en lokal kopi av) en tjeneste du ikke har skrivetilgang til. Det er dog ikke mulig å dele/lagre disse endringene.
- Det kan virke tilfeldig hvor i lista et nytt element dukker opp når du legger det til via drag and drop.

## Fullstendig oversikt over feil

Alle bugs registreres i [issue-lista for Altinn studio på Github](https://github.com/Altinn/altinn-studio/issues?q=is%3Aopen+is%3Aissue+label%3Abug). Fra denne siden kan du også legge til beskrivelse av nye bugs hvis du finner det.
