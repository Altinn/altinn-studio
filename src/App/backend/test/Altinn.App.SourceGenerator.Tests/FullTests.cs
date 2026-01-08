using System.ComponentModel.DataAnnotations;
using System.Reflection;
using System.Text.Json.Serialization;
using Altinn.App.Analyzers;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.Data;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Newtonsoft.Json.Serialization;
using Xunit.Abstractions;

namespace Altinn.App.SourceGenerator.Tests;

public class FullTests(ITestOutputHelper output)
{
    [Fact]
    public async Task Run()
    {
        var source = """
            #nullable enable
            using System;
            using System.Collections.Generic;
            using System.ComponentModel.DataAnnotations;
            using System.Text.Json.Serialization;
            using System.Xml.Serialization;
            using Microsoft.AspNetCore.Mvc.ModelBinding;

            namespace Altinn.App.SourceGenerator.Tests;

            public class Skjema
            {
                // Extra properties to test that they get ignored by source generator
                public const string FormDataType = "form";
                public static readonly string FormDataTypeStatic = FormDataType;
                public string FormDataTypeId => FormDataType;

                [JsonPropertyName("skjemanummer")]
                public string? Skjemanummer { get; set; }

                [JsonPropertyName("skjemaversjon")]
                public string? Skjemaversjon { get; set; }

                [JsonPropertyName("skjemainnhold")]
                public List<SkjemaInnhold?>? Skjemainnhold { get; set; }

                [JsonPropertyName("eierAdresse")]
                public Adresse? EierAdresse { get; set; }
            }

            public class SkjemaInnhold
            {
                [JsonPropertyName("altinnRowId")]
                [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
                public Guid AltinnRowId { get; set; }

                [JsonPropertyName("navn")]
                public string? Navn { get; set; }

                [JsonPropertyName("alder")]
                public int? Alder { get; set; }

                [JsonPropertyName("deltar")]
                public bool? Deltar { get; set; }

                [JsonPropertyName("adresse")]
                public Adresse? Adresse { get; set; }

                [JsonPropertyName("tidligere-adresse")]
                public List<Adresse>? TidligereAdresse { get; set; }

                [JsonPropertyName("oldXmlValue")]
                public OldXmlValue? OldXmlValue { get; set; }

                [JsonPropertyName("withCollection")]
                public ICollection<Adresse>? WithCollection { get; set; }
            }

            public class Adresse
            {
                [JsonPropertyName("altinnRowId")]
                [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
                public Guid AltinnRowId { get; set; }

                [JsonPropertyName("gate")]
                public string? Gate { get; set; }

                [JsonPropertyName("postnummer")]
                public int? Postnummer { get; set; }

                [JsonPropertyName("poststed")]
                public string? Poststed { get; set; }


                // List of string is invalid in altinn datamodels, but might be used for backend purposes and must compile
                [JsonPropertyName("tags")]
                [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
                public List<string>? Tags { get; set; }
            }

            public class OldXmlValue
            {
              [Range(-999999999999999d, 999999999999999d)]
              [Required]
              [XmlIgnore]
              [JsonPropertyName("value")]
              public decimal? valueNullable { get; set; }

              [XmlText]
              [JsonIgnore]
              public decimal value
              {
                get => valueNullable ?? default;
                set
                {
                  this.valueNullable = value;
                }
              }

              [XmlAttribute("orid")]
              [BindNever]
              public string orid { get; set; } = "7117";

            }
            """;
        var syntax = CSharpSyntaxTree.ParseText(source, path: "models/Models.cs");

        var applicationMetadata = """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                "id": "ttd/source-generator-test",
                "title": {},
                "org": "ttd",
                "partyTypesAllowed": {},
                "dataTypes": [{
                    "id": "form",
                    "appLogic": {
                        "classRef": "Altinn.App.SourceGenerator.Tests.Skjema"
                    }
                }]
            }

            """;

        await Verify(RunFormDataWrapper([syntax], applicationMetadata));
    }

    private GeneratorDriverRunResult RunFormDataWrapper(SyntaxTree[] sources, string applicationMetadata)
    {
        var currentAssembly = Assembly.GetAssembly(typeof(Skjema));
        // Get references so that the test compilation can reference system libraries
        IEnumerable<PortableExecutableReference> references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(static assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Where(assembly => assembly != currentAssembly)
            .Select(static assembly => MetadataReference.CreateFromFile(assembly.Location))
            .Concat([
                MetadataReference.CreateFromFile(typeof(RangeAttribute).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(BindNeverAttribute).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(JsonProperty).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(RequiredAttribute).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(JsonIgnoreAttribute).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(JsonPropertyNameAttribute).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(IFormDataWrapper).Assembly.Location),
                MetadataReference.CreateFromFile(typeof(DataModelException).Assembly.Location),
            ]);

        var compilation = CSharpCompilation.Create(
            "name",
            sources,
            references,
            new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary)
        );
        var generator = new FormDataWrapperGenerator();

        GeneratorDriver driver = CSharpGeneratorDriver.Create(generator);
        driver = driver.AddAdditionalTexts([
            new AdditionalTextImplementation(applicationMetadata, "C:\\temp\\config\\applicationmetadata.json"),
        ]);
        driver = driver.WithUpdatedAnalyzerConfigOptions(new TestAnalyzerConfigOptionsProvider(isAltinnApp: true));
        var results = driver.RunGenerators(compilation);

        var runResult = results.GetRunResult();

        Assert.Empty(compilation.GetDiagnostics());

        // Ensure that the generated code compiles without errors
        var updatedCompilation = compilation.AddSyntaxTrees(runResult.GeneratedTrees);
        var diagnostics = updatedCompilation.GetDiagnostics();
        output.WriteLine(string.Join(Environment.NewLine, diagnostics));
        Assert.Empty(diagnostics);

        // Verify the generated code
        return runResult;
    }
}
