# Altinn File Analyzers
![GitHub release (latest SemVer including pre-releases)](https://img.shields.io/github/v/release/altinn/fileanalyzers-lib-dotnet)
![GitHub last commit](https://img.shields.io/github/last-commit/altinn/fileanalyzers-lib-dotnet)
![GitHub](https://img.shields.io/github/license/altinn/fileanalyzers-lib-dotnet)

This library contains code for doing deep file analysis based the actual binary data of files uploaded to an instance in Altinn 3. The implementation is two folded, one part that analyses and another part that validates against the analysis results. The reasoning for this split is to be able to use only the analyzer and extract metadata without validating. In addition it will be simpler to configure validators against a standardized result set rather than embed that into the analysis code.

The [Getting started](#getting-started) section describes the basic steps required in order to use this package within an Altinn 3 application. For a more comprehensive description of file analysers in Altinn 3 please see https://docs.altinn.studio/app/development/logic/validation/files/.
<hr>
<br/>  

## Getting started using the package

This guide assumes you have an existing Altinn 3 application. If not please see https://docs.altinn.studio/app/getting-started/create-app/ to get started.

1. Add reference to [Altinn.FileAnalyzers nuget package](https://www.nuget.org/packages/Altinn.FileAnalyzers)  
   Open command line to the repo of your application and navigate to the App folder where the App.csproj file is located and run the following command:

   ```shell
   nuget install Altinn.FileAnalyzers
   ```
2. Register the analyzers you would like to use
   Each analyzer/validator has it's own method for registering required services. Se table below for available analyser.
   ```csharp
   services.AddMimeTypeValidation();
   ```
   
3. Configure the the analyzer for the datatype it should be used for 
   The analyzer is configured on a per datatype basis and will only run against the configured datatype. The example below configures the mime type analyzer and it's corresponding validator.

   ```json
      {
         "id": "08112113-cc3a-4d35-a8d2-bfba53a1ddfd",
         "allowedContentTypes": ["image/jpeg", "application/pdf"],
         "taskId": "Task_1",
         "maxSize": 25,
         "maxCount": 1,
         "minCount": 1,
         "enablePdfCreation": false,
         "enabledFileAnalysers": [ "mimeTypeAnalyser" ],
         "enabledFileValidators": [ "mimeTypeValidator" ]
      }
   ```

## Available analyzers and their corresponding validators
| Analyser Id                 | Validator Id       | Description                                                                                                                                                                               |
| --------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mimeTypeAnalyser            | mimeTypeValidator  | Checks if a file is actually the MIME type it claims to be. This uses the [Mime Detective](https://github.com/MediatedCommunications/Mime-Detective) library to determine the mime type.  |


## Automated tests

## Contributing

## Licence