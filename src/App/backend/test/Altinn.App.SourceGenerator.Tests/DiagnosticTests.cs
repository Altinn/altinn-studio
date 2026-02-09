using System.Collections.Immutable;
using System.Reflection;
using System.Text.Json.Serialization;
using Altinn.App.Analyzers.FormDataWrapper;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.SourceGenerator.Tests;

public class DiagnosticTests
{
    private const string Source = """
        #nullable enable
        using System;
        using System.Collections.Generic;
        using System.Text.Json.Serialization;

        namespace Altinn.App.SourceGenerator.Tests;

        public class Skjema
        {
            [JsonPropertyName("skjemanummer")]
            public string? Skjemanummer { get; set; }

            [JsonPropertyName("skjemaversjon")]
            public string? Skjemaversjon { get; set; }

            [JsonPropertyName("skjemainnhold")]
            public List<SkjemaInnhold?>? Skjemainnhold { get; set; }
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
        }

        """;

    [Fact]
    public async Task RunNoDiagnostic()
    {
        var applicationMetadata = """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                "id": "ttd/source-generator-test",
                "title": {},
                "org": "ttd",
                "partyTypesAllowed": {},
                "dataTypes": [
                    {
                        "id": "data-ref-pdf",
                    },
                    {
                        "id": "data-ref",
                        "appLogic": {}
                    },
                    {
                        "id": "data-ref",
                        "appLogic": {
                            "classRef": null,
                        }
                    },
                    {
                        "id": "form",
                        "appLogic": {
                            "classRef": "Altinn.App.SourceGenerator.Tests.Skjema"
                        }
                    }
                ]
            }

            """;

        var diagnostics = await RunFormDataWrapperAnalyzer([Source], applicationMetadata);
        Assert.Empty(diagnostics);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ClassNotFound(bool isAltinnApp)
    {
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
                        "classRef": "Altinn.App.SourceGenerator.Tests.NotFound"
                    }
                }]
            }

            """;

        var diagnostics = await RunFormDataWrapperAnalyzer(
            [CSharpSyntaxTree.ParseText(Source)],
            [new AdditionalTextImplementation(applicationMetadata, "C:\\temp\\config\\applicationmetadata.json")],
            isAltinnApp
        );
        await Verify(diagnostics).UseParameters(isAltinnApp);
    }

    [Fact]
    public async Task RunJsonError()
    {
        var applicationMetadata = """
            {
                "title": {,},
            }

            """;

        var diagnostics = RunFormDataWrapperAnalyzer([Source], applicationMetadata);
        await Verify(diagnostics);
    }

    [Fact]
    public async Task RunJsonNoDataTypes()
    {
        var applicationMetadata = """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                "id": "ttd/source-generator-test",
            }

            """;

        var diagnostics = await RunFormDataWrapperAnalyzer([Source], applicationMetadata);
        await Verify(diagnostics);
    }

    [Fact]
    public async Task RunJsonEmptyDataTypes()
    {
        var applicationMetadata = """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                "id": "ttd/source-generator-test",
                "dataTypes": []
            }

            """;

        var diagnostics = await RunFormDataWrapperAnalyzer([Source], applicationMetadata);
        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task NotJsonObject()
    {
        var applicationMetadata = "null";

        var diagnostics = await RunFormDataWrapperAnalyzer([Source], applicationMetadata);
        await Verify(diagnostics);
    }

    [Fact]
    public async Task ErrorReadingAppMetadata()
    {
        string? applicationMetadata = null;

        var diagnostics = await RunFormDataWrapperAnalyzer([Source], applicationMetadata);
        await Verify(diagnostics);
    }

    [Fact]
    public async Task NoAppMetadataFile()
    {
        var diagnostics = await RunFormDataWrapperAnalyzer([CSharpSyntaxTree.ParseText(Source)], []);
        await Verify(diagnostics);
    }

    [Fact]
    public async Task MultipleAppMetadataFile()
    {
        var applicationMetadata = """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                "id": "ttd/source-generator-test",
                "dataTypes": []
            }

            """;
        var diagnostics = await RunFormDataWrapperAnalyzer(
            [CSharpSyntaxTree.ParseText(Source)],
            [
                new AdditionalTextImplementation(applicationMetadata, "C:\\temp\\config\\applicationmetadata.json"),
                new AdditionalTextImplementation(applicationMetadata, "C:\\temp2\\config\\applicationmetadata.json"),
            ]
        );
        await Verify(diagnostics);
    }

    private static async Task<ImmutableArray<Diagnostic>> RunFormDataWrapperAnalyzer(
        IEnumerable<SyntaxTree> syntaxTrees,
        ImmutableArray<AdditionalText> additionalFiles,
        bool isAltinnApp = true
    )
    {
        var currentAssembly = Assembly.GetAssembly(typeof(Skjema));
        // Get references so that the test compilation can reference system libraries
        IEnumerable<PortableExecutableReference> references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(static assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Where(assembly => assembly != currentAssembly)
            .Select(static assembly => MetadataReference.CreateFromFile(assembly.Location))
            .Concat([MetadataReference.CreateFromFile(typeof(JsonPropertyNameAttribute).Assembly.Location)]);

        var options = new AnalyzerOptions(additionalFiles, new TestAnalyzerConfigOptionsProvider(isAltinnApp));
        return await CSharpCompilation
            .Create("name", syntaxTrees, references, new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary))
            .WithAnalyzers([new FormDataWrapperAnalyzer()], options)
            .GetAllDiagnosticsAsync();
    }

    private static async Task<ImmutableArray<Diagnostic>> RunFormDataWrapperAnalyzer(
        string[] syntax,
        string? applicationMetadata
    )
    {
        return await RunFormDataWrapperAnalyzer(
            syntax.Select(
                (s, i) => CSharpSyntaxTree.ParseText(s, path: $"/Altinn/ttd/altinn-app-frontend/models/Models{i}.cs")
            ),
            [new AdditionalTextImplementation(applicationMetadata, "C:\\temp\\config\\applicationmetadata.json")]
        );
    }
}
