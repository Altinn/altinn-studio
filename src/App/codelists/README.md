# Altinn Common Codelists
![GitHub release (latest SemVer including pre-releases)](https://img.shields.io/github/v/release/altinn/codelists-lib-dotnet)
![GitHub last commit](https://img.shields.io/github/last-commit/altinn/codelists-lib-dotnet)
![GitHub](https://img.shields.io/github/license/altinn/codelists-lib-dotnet)

This library contains common code lists for use in Altinn 3 based applications. 

The [Getting started](#getting-started) section describes the basic steps required in order to use this package within an Altinn 3 application. For a more comprehensive description of code lists in Altinn 3 please see https://docs.altinn.studio/app/development/data/options/.
<hr>
<br/>  

## Getting started using the package

This guide assumes you have an existing Altinn 3 application. If not please see https://docs.altinn.studio/app/getting-started/create-app/ to get started.

### 1. Add reference to [Altinn.Codelists nuget package](https://www.nuget.org/packages/Altinn.Codelists)  
   Open command line to the repo of your application and navigate to the App folder where the App.csproj file is located and run the following command:

   ```shell
   dotnet add package Altinn.Codelists
   ```
   This will add the latest stable version of the package to your solution.

   As an alternative you can edit your applications App.csproj file directly by adding the reference below to the `<itemgroup>` where you have package references. 
   ```xml
     <PackageReference Include="Altinn.Codelists" Version="0.5.0" />     
   ```
   Note that you then need to explicitly specify the version you would like. See the link on step one for available versions.

### 2. Register the codelists in your app DI container  
   Add the following to your Program.cs file:
   ```csharp
   services.AddAltinnCodelists();
   ```
   By calling this you will register all codelists accross all sources listed below in available codelists. You can also register codelists one by one if you for example would like to provide your own codelist id, or if you would like to control the mappings to description and help texts.

### 3. Connect your application to the codelist you would like to use  
   See the section below for available codelist id's.

   You can either do this using [Altinn Studio](https://altinn.studio) and configure the *Kodeliste-ID* of your component in the UI.

   Or you can configure the component by editing the optionsId property in FormLayout.json according to the [documentation](https://docs.altinn.studio/app/development/data/options/#connect-the-component-to-options-code-list) 

## Custom configuration
While the above mentioned configuration where you call `services.AddAltinnCodelists();` will add all available codelists with default values, there are cases where you might want to customize the configuration. The examples will vary a bit depending on the source of the codelist.

### Add a codelist with custom codelist id
If you don't want to use the default codelist id, or only want to register codelists relevant for you app you can register each codelist individually.

Example using codelist from SSB overriding the option id:
```csharp
   services.AddSSBClassificationCodelistProvider("næring", Classification.IndustryGrouping);
```

### Add a codelist with default parameters
Some of the codelists accepts parameters controlling what's returned.

Example using the codelist from SSB specifiying a level filter to only get values from the first level (this particular codelist is hierarchical).

```csharp
   services.AddSSBClassificationCodelistProvider("næring", Classification.IndustryGrouping, new Dictionary<string, string>() { { "level", "1" } });
```
The default parameters is a name/value pair collection allowing for any parameter to be passed in and picked up by the implementation of the codelist provider.

### Add a codelist that has support for description and/or help text values
While a regular codelist is only key/value pairs, you can extend this with adding description and help text allowing for a more descriptive UI.

The following example enables the notes field from SSB classification to populate the description text.

```csharp
    services.AddSSBClassificationCodelistProvider("næring", Classification.IndustryGrouping,
        new ClassificationOptions() { MapNotesToDescription = true },
        new Dictionary<string, string>() { { "level", "1" } });
```
The above example enables a predefined way of adding a description text. If you would like to customize the description text even further you can pass inn a function.
The follwing examples passes in a function that that will be evaluated when populating the code list and will return a combination of the classification code and the notes fields separated by colon.

```csharp
services.AddSSBClassificationCodelistProvider(
        "næring",
        Classification.IndustryGrouping,
        new ClassificationOptions() 
        { 
            MapDescriptionFunc = (classificationCode) => $"{classificationCode.Code}: {classificationCode.Notes}" 
        },
        new Dictionary<string, string>() { { "level", "1" } });
```

### Add a codelist from SSB not available in the `Classification` enum.
Currently only a small subset of the available codelist from SSB is included in the `Classification` enum. The enum is really only provided as a more readable version of the underlying id provided by SSB. But in our case also serves as a way of telling what codelists we have tested explicitly against. If you find a codelist you would like to use, you can specify it's id instead of the enum.

```csharp
   services.AddSSBClassificationCodelistProvider("næring", 6);
```


## Available codelists
The list below shows currently implemented code lists with their default id.

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
| poststed                 | Posten       | Norwegian postal codes                                              |
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

### [Posten](https://www.bring.no)
Doc: https://www.bring.no/tjenester/adressetjenester/postnummer/postnummertabeller-veiledning

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.
## Authors
Altinn Apps development team - If you want to get in touch, just create a new issue.
See also the list of [contributors](https://github.com/Altinn/codelists-lib-dotnet/graphs/contributors) who participated in this project.
## License
This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
