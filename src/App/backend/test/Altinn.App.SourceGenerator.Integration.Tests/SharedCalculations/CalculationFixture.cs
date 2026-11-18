using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.SourceGenerator.Integration.Tests.SharedCalculations;

/// <summary>
/// A file in <c>src/common/expression-tests/calculation</c>. The format is described in the README there.
/// </summary>
public sealed class CalculationFixture
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("disabledFrontend")]
    public bool DisabledFrontend { get; set; }

    [JsonPropertyName("disabledBackend")]
    public bool DisabledBackend { get; set; }

    /// <summary>The data of the data type <c>default</c>, read the way the app reads a stored data element</summary>
    [JsonPropertyName("dataModel")]
    public CalculationTestModel? DataModel { get; set; }

    [JsonPropertyName("dataModels")]
    public List<CalculationDataModel>? DataModels { get; set; }

    /// <summary>
    /// The list from the calculation file, or one list per data type. It stays JSON so that the runner parses it
    /// with <c>CalculationConfig.Parse</c>, as the app parses the file.
    /// </summary>
    [JsonPropertyName("calculations")]
    public JsonElement? Calculations { get; set; }

    /// <summary>
    /// The expected data, or the expected data per data type. It stays JSON because it can leave properties out
    /// and use the <c>"&lt;new&gt;"</c> row id placeholder, which a <see cref="CalculationTestModel"/> cannot.
    /// </summary>
    [JsonPropertyName("expects")]
    public JsonElement? Expects { get; set; }

    [JsonPropertyName("expectsFailure")]
    public string? ExpectsFailure { get; set; }

    [JsonPropertyName("expectsFailureBackend")]
    public string? ExpectsFailureBackend { get; set; }

    [JsonPropertyName("expectsWarnings")]
    public List<string>? ExpectsWarnings { get; set; }

    [JsonPropertyName("expectsErrors")]
    public List<string>? ExpectsErrors { get; set; }

    [JsonPropertyName("testCases")]
    public List<CalculationFixture>? TestCases { get; set; }

    /// <summary>The root runs as a case of its own when it has an expectation.</summary>
    [JsonIgnore]
    public bool HasExpectation =>
        Expects is not null || ExpectsFailure is not null || ExpectsFailureBackend is not null;

    /// <summary>
    /// The cases in the file: the root when it has an expectation, then each test case, which inherits the data
    /// models, the calculations and the disabled markers it does not set from the root.
    /// </summary>
    public IEnumerable<(int Index, CalculationFixture Case)> GetCases()
    {
        if (HasExpectation)
        {
            yield return (-1, this);
        }
        foreach (var (testCase, index) in (TestCases ?? []).Select((testCase, index) => (testCase, index)))
        {
            var hasOwnData = testCase.DataModel is not null || testCase.DataModels is not null;
            yield return (
                index,
                new CalculationFixture
                {
                    Name = $"{Name} / {testCase.Name}",
                    Comment = testCase.Comment ?? Comment,
                    DisabledFrontend = DisabledFrontend || testCase.DisabledFrontend,
                    DisabledBackend = DisabledBackend || testCase.DisabledBackend,
                    DataModel = hasOwnData ? testCase.DataModel : DataModel,
                    DataModels = hasOwnData ? testCase.DataModels : DataModels,
                    Calculations = testCase.Calculations ?? Calculations,
                    Expects = testCase.Expects,
                    ExpectsFailure = testCase.ExpectsFailure,
                    ExpectsFailureBackend = testCase.ExpectsFailureBackend,
                    ExpectsWarnings = testCase.ExpectsWarnings,
                    ExpectsErrors = testCase.ExpectsErrors,
                }
            );
        }
    }

    /// <summary>
    /// Unknown properties fail, both in the fixture and in its data, so a misspelled property cannot pass silently.
    /// </summary>
    private static readonly JsonSerializerOptions _options = new()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
    };

    /// <summary>Loads a file. Every call gives new model objects, so a case cannot see the writes of another.</summary>
    public static CalculationFixture Load(string relativePath) =>
        JsonSerializer.Deserialize<CalculationFixture>(File.ReadAllText(Path.Join(Folder, relativePath)), _options)
        ?? throw new InvalidOperationException($"{relativePath} is null");

    /// <summary>The fixture files, relative to <see cref="Folder"/>, with / as separator.</summary>
    public static IEnumerable<string> Files() =>
        Directory
            .GetFiles(Folder, "*.json", SearchOption.AllDirectories)
            .Select(path => Path.GetRelativePath(Folder, path).Replace('\\', '/'))
            .Where(path => path != SchemaFile)
            .Order(StringComparer.Ordinal);

    public const string SchemaFile = "model.schema.json";

    public static string Folder { get; } = GetFolder();

    private static string GetFolder([CallerFilePath] string callerFilePath = "")
    {
        // This file is in src/App/backend/test/<project>/SharedCalculations
        var folder = Path.GetFullPath(
            Path.Join(
                Path.GetDirectoryName(callerFilePath),
                "..",
                "..",
                "..",
                "..",
                "..",
                "common",
                "expression-tests",
                "calculation"
            )
        );
        return Directory.Exists(folder)
            ? folder
            : throw new DirectoryNotFoundException($"Shared calculation tests not found in {folder}");
    }
}

public sealed class CalculationDataModel
{
    [JsonPropertyName("dataElement")]
    public required CalculationDataElement DataElement { get; set; }

    [JsonPropertyName("data")]
    public required CalculationTestModel Data { get; set; }
}

/// <summary>The part of a data element that the tests set</summary>
public sealed class CalculationDataElement
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("dataType")]
    public required string DataType { get; set; }

    public DataElement ToDataElement() => new() { Id = Id, DataType = DataType };
}
