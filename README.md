# Altinn Common Codelists
This library contains common code lists for use in Altinn 3 based applications.

## Getting started
1. Add reference to [Altinn.Codelists nuget package](https://www.nuget.org/packages/Altinn.Codelists)  
   Open command line to the repo of your application and navigate to the App folder where the App.csproj file is located and run the following command:

   ```shell
   nuget install Altinn.Codelists
   ```
2. Register the codelists in your app DI container  
   Add the following to your Program.cs file:
   ```csharp
   services.AddAltinnCodelists();
   ```
   By calling this you will add all codelists accross all sources listed below in available codelists.
3. Connect your application to the codelist you would like to use  
   See the section below for available codelist id's.

   You can either do this using [Altinn Studio](https://altinn.studio) and configure the *Kodeliste-ID* of your component.

   Or you can configure the component by editing the optionsId property in FormLayout.json according to the [documentation](https://docs.altinn.studio/app/development/data/options/#connect-the-component-to-options-code-list) 

## Available codelists

| Default Codelist Id      | Source       | Description                                               |
|------------------------- | ------------ | --------------------------------------------------------- |
| fylker                   | SSB          | The counties of Norway                                    |
| fylker-kv                | Kartverket   | The counties of Norway                                    |
| grunnbeløpfolketrygden   | SSB          | National insurance base amount                            |
| kjønn                    | SSB          | Sex                                                       |
| kommuner                 | SSB          | The communes of Norway (all)                              |
| kommuner-kv              | Kartverket   | The communes of Norway with ability to filter on county   |
| land                     | SSB          | The countries of the world                                |
| næringsgruppering        | SSB          | Industrical grouping                                      |
| sivilstand               | SSB          | Marital status                                            |
| yrker                    | SSB          | Occupations                                               |



## Sources
Below are the sources used for the various codelists above. The underlying api's provide different functionality with regards to query parameters. Espessialy the SSB api's provide a rich set of parameters allowing the query for valid values on a given date or date range.

### [Statistisk Sentralbyrå/SSB](https://www.ssb.no/)
Doc: https://data.ssb.no/api/klass/v1/api-guide.html

Licence: https://data.ssb.no/api/klass/v1/api-guide.html#_license

### [Kartverket/KV](https://www.kartverket.no/)
Doc: https://kartkatalog.geonorge.no/metadata/administrative-enheter-kommuner/041f1e6e-bdbc-4091-b48f-8a5990f3cc5b

Api: https://ws.geonorge.no/kommuneinfo/v1/

Licence: https://www.kartverket.no/api-og-data/vilkar-for-bruk

## Automated tests
## Contributing

## Licence