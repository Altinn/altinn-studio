using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Calculation;
using Altinn.App.SourceGenerator.Integration.Tests.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Testing;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.SourceGenerator.Integration.Tests.SharedCalculations;

/// <summary>
/// Runs the shared calculation tests in <c>src/common/expression-tests/calculation</c>, which the App frontend also
/// runs. Each case runs through the generated <see cref="IFormDataWrapper"/> of <see cref="CalculationTestModel"/>,
/// which is what apps use, and again through <see cref="ReflectionFormDataWrapper"/>.
/// </summary>
public sealed class SharedCalculationTests(ITestOutputHelper output)
{
    private const string TaskId = "Task_1";

    /// <summary>The placeholder for the id of a row the calculation adds</summary>
    private const string NewRowId = "<new>";

    private const string AltinnRowId = "altinnRowId";

    public static TheoryData<string, int, string, string> Cases()
    {
        var data = new TheoryData<string, int, string, string>();
        // RUN_DISABLED=1 also runs the cases marked disabledBackend, to see how they fail
        var runDisabled = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("RUN_DISABLED"));
        foreach (var file in CalculationFixture.Files())
        {
            foreach (var (index, testCase) in CalculationFixture.Load(file).GetCases())
            {
                if (!testCase.DisabledBackend || runDisabled)
                {
                    data.Add(file, index, testCase.Name ?? "", "generated");
                    data.Add(file, index, testCase.Name ?? "", "reflection");
                }
            }
        }
        return data;
    }

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Calculation(string file, int caseIndex, string name, string wrapper)
    {
        var testCase = CalculationFixture.Load(file).GetCases().Single(c => c.Index == caseIndex).Case;
        output.WriteLine($"{file}: {name} ({wrapper} wrapper)");
        if (testCase.Comment is not null)
        {
            output.WriteLine(testCase.Comment);
        }

        var dataModels = GetDataModels(testCase);
        var calculations = GetCalculations(testCase, dataModels[0].DataElement.DataType);
        var logger = new FakeLogger<DataModelFieldCalculator>();

        var appResources = new Mock<IAppResources>(MockBehavior.Strict);
        appResources
            .Setup(resources => resources.GetTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((TextResource?)null);
        var accessChecker = new Mock<IDataElementAccessChecker>(MockBehavior.Strict);
        accessChecker.Setup(checker => checker.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>())).ReturnsAsync(true);

        var dataAccessor = new CalculationDataAccessor(
            new Instance
            {
                Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
                AppId = "org/app",
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = TaskId } },
                Data = [],
            },
            new TranslationService(
                new AppIdentifier("org", "app"),
                appResources.Object,
                NullLogger<TranslationService>.Instance
            ),
            wrapper switch
            {
                "generated" => (model, dataType, dataElement) =>
                    new Altinn_App_SourceGenerator_Integration_Tests_Models_CalculationTestModelFormDataWrapper(
                        model,
                        dataType,
                        dataElement
                    ),
                "reflection" => (model, dataType, dataElement) =>
                    new ReflectionFormDataWrapper(model, dataType, dataElement),
                _ => throw new ArgumentOutOfRangeException(nameof(wrapper)),
            }
        );
        var models = new Dictionary<string, CalculationTestModel>();
        var inputRowIds = new Dictionary<string, List<string>>();
        foreach (var dataModel in dataModels)
        {
            dataAccessor.Add(dataModel.DataElement.ToDataElement(), dataModel.Data);
            models.Add(dataModel.DataElement.DataType, dataModel.Data);
            inputRowIds.Add(dataModel.DataElement.DataType, CollectRowIds(dataModel.Data));
        }

        Exception? exception = null;
        try
        {
            var configs = calculations.ToDictionary(
                pair => pair.Key,
                pair =>
                    CalculationConfig.Parse(
                        Encoding.UTF8.GetBytes($$"""{"calculations": {{pair.Value.GetRawText()}}}"""),
                        $"App/models/{pair.Key}.calculation.json"
                    )
            );
            appResources
                .Setup(resources => resources.GetCalculationConfig(It.IsAny<string>()))
                .Returns((string dataType) => configs.GetValueOrDefault(dataType));
            var calculator = new DataModelFieldCalculator(logger, appResources.Object, accessChecker.Object);
            await calculator.Calculate(dataAccessor, TaskId);
        }
        catch (Exception e)
        {
            exception = e;
        }

        var logs = logger.Collector.GetSnapshot();
        foreach (var log in logs)
        {
            output.WriteLine($"{log.Level}: {log.Message}");
        }

        var expectsFailure = testCase.ExpectsFailureBackend ?? testCase.ExpectsFailure;
        if (expectsFailure is not null)
        {
            Assert.True(exception is not null, $"Expected the calculation to fail with '{expectsFailure}'");
            output.WriteLine($"Failed as expected: {exception}");
            Assert.Contains(expectsFailure, exception.Message, StringComparison.Ordinal);
            return;
        }

        if (exception is not null)
        {
            throw new Xunit.Sdk.XunitException($"The calculation failed: {exception}");
        }
        Assert.DoesNotContain(logs, log => log.Level >= LogLevel.Error);

        var expects = GetExpects(testCase, dataModels);
        var serializer = new ModelSerializationService(Mock.Of<IAppModel>());
        foreach (var dataModel in dataModels)
        {
            var dataType = dataModel.DataElement.DataType;
            // Row ids are given to new rows when the changes are collected after data processing, before the data
            // is saved and returned to the frontend
            var formDataWrapper = await dataAccessor.GetFormDataWrapper(dataModel.DataElement.ToDataElement());
            formDataWrapper.InitializeAltinnRowIds();
            var actual = JsonNode.Parse(serializer.SerializeToJson(models[dataType]).Span);
            var expected = expects[dataType];
            output.WriteLine($"{dataType} expected: {expected?.ToJsonString()}");
            output.WriteLine($"{dataType} actual:   {actual?.ToJsonString()}");

            var errors = new List<string>();
            var actualRowIds = CollectRowIds(actual);
            Compare(expected, actual, dataType, errors, inputRowIds[dataType], actualRowIds);
            Assert.True(errors.Count == 0, string.Join(Environment.NewLine, errors));
        }
        AssertWarnings(testCase.ExpectsWarnings, logs.Where(log => log.Level == LogLevel.Warning).ToList());
    }

    /// <summary>
    /// Every fixture is valid on both sides: a case has data, calculations and one kind of expectation, and a
    /// disabled marker comes with a comment. Unknown properties fail when the file is loaded.
    /// </summary>
    [Fact]
    public void Fixtures_are_valid()
    {
        var files = CalculationFixture.Files().ToList();
        Assert.NotEmpty(files);
        foreach (var file in files)
        {
            var fixture = CalculationFixture.Load(file);
            Assert.False(string.IsNullOrWhiteSpace(fixture.Name), $"{file} has no name");
            var cases = fixture.GetCases().ToList();
            Assert.True(cases.Count > 0, $"{file} has no case with an expectation");
            Assert.All(fixture.TestCases ?? [], testCase => Assert.Null(testCase.TestCases));
            foreach (var (_, testCase) in cases)
            {
                var where = $"{file}: {testCase.Name}";
                Assert.True(testCase.Calculations is not null, $"{where} has no calculations");
                Assert.True(
                    (testCase.DataModel is null) != (testCase.DataModels is null),
                    $"{where} must have either dataModel or dataModels"
                );
                // expectsFailureBackend may stand next to expects: the backend fails, the frontend gets the result
                Assert.True(
                    testCase.Expects is null || testCase.ExpectsFailure is null,
                    $"{where} has both expects and expectsFailure"
                );
                Assert.True(
                    testCase.Expects is not null || testCase.ExpectsFailure is not null,
                    $"{where} has no expects or expectsFailure"
                );
                Assert.False(testCase.DisabledFrontend && testCase.DisabledBackend, $"{where} runs on neither side");
                Assert.True(
                    !(testCase.DisabledFrontend || testCase.DisabledBackend) || testCase.Comment is not null,
                    $"{where} is disabled without a comment that says why"
                );
            }
        }
    }

    /// <summary>
    /// The frontend runs the fixtures against <c>model.schema.json</c>, so the C# model must have the same
    /// properties with matching types. Non-nullable value types must be required in the schema.
    /// </summary>
    [Fact]
    public void Model_matches_the_shared_schema()
    {
        using var schema = JsonDocument.Parse(
            File.ReadAllText(Path.Join(CalculationFixture.Folder, CalculationFixture.SchemaFile))
        );
        var errors = new List<string>();
        CompareType(typeof(CalculationTestModel), schema.RootElement, schema.RootElement, "", errors);
        Assert.True(errors.Count == 0, string.Join(Environment.NewLine, errors));
    }

    private static void CompareType(Type type, JsonElement schema, JsonElement root, string path, List<string> errors)
    {
        schema = Resolve(schema, root);
        var properties = schema.GetProperty("properties");
        var required = schema.TryGetProperty("required", out var requiredElement)
            ? requiredElement.EnumerateArray().Select(e => e.GetString()).ToHashSet()
            : [];
        var csharpProperties = type.GetProperties()
            .Select(p =>
                (
                    Name: p.GetCustomAttributes(typeof(System.Text.Json.Serialization.JsonPropertyNameAttribute), false)
                        .Cast<System.Text.Json.Serialization.JsonPropertyNameAttribute>()
                        .Single()
                        .Name,
                    Property: p
                )
            )
            .Where(p => p.Name != AltinnRowId)
            .ToList();
        var schemaNames = properties.EnumerateObject().Select(p => p.Name).ToHashSet();
        foreach (var missing in schemaNames.Except(csharpProperties.Select(p => p.Name)))
        {
            errors.Add($"{path}{missing} is in the schema but not in {type.Name}");
        }
        foreach (var (name, property) in csharpProperties)
        {
            if (!properties.TryGetProperty(name, out var propertySchema))
            {
                errors.Add($"{path}{name} is in {type.Name} but not in the schema");
                continue;
            }
            var propertyType = property.PropertyType;
            var underlying = Nullable.GetUnderlyingType(propertyType);
            if (propertyType.IsValueType && underlying is null && !required.Contains(name))
            {
                errors.Add($"{path}{name} is a non-nullable {propertyType.Name}, but not required in the schema");
            }
            if ((underlying is not null || !propertyType.IsValueType) && required.Contains(name))
            {
                errors.Add($"{path}{name} is required in the schema, but nullable in {type.Name}");
            }
            CompareProperty(underlying ?? propertyType, propertySchema, root, $"{path}{name}", errors);
        }
    }

    private static void CompareProperty(
        Type type,
        JsonElement schema,
        JsonElement root,
        string path,
        List<string> errors
    )
    {
        schema = Resolve(schema, root);
        var types = schema.GetProperty("type") is { ValueKind: JsonValueKind.Array } array
            ? array.EnumerateArray().Select(e => e.GetString()).Where(t => t != "null").ToList()
            : [schema.GetProperty("type").GetString()];
        var expected = type switch
        {
            _ when type == typeof(string) => "string",
            _ when type == typeof(decimal) || type == typeof(double) => "number",
            _ when type == typeof(int) || type == typeof(long) => "integer",
            _ when type == typeof(bool) => "boolean",
            { IsGenericType: true } when type.GetGenericTypeDefinition() == typeof(List<>) => "array",
            { IsClass: true } => "object",
            _ => $"unsupported {type.Name}",
        };
        if (types.Count != 1 || types[0] != expected)
        {
            errors.Add($"{path} is {expected} in C#, but {string.Join("|", types)} in the schema");
            return;
        }
        if (expected == "array")
        {
            CompareProperty(type.GetGenericArguments()[0], schema.GetProperty("items"), root, $"{path}[]", errors);
        }
        else if (expected == "object")
        {
            CompareType(type, schema, root, $"{path}.", errors);
        }
    }

    private static JsonElement Resolve(JsonElement schema, JsonElement root)
    {
        if (!schema.TryGetProperty("$ref", out var reference))
        {
            return schema;
        }
        var resolved = root;
        foreach (var part in reference.GetString()!.TrimStart('#', '/').Split('/'))
        {
            resolved = resolved.GetProperty(part);
        }
        return resolved;
    }

    private static List<CalculationDataModel> GetDataModels(CalculationFixture testCase)
    {
        if (testCase.DataModels is { } dataModels)
        {
            return dataModels;
        }
        if (testCase.DataModel is { } data)
        {
            return
            [
                new CalculationDataModel
                {
                    DataElement = new CalculationDataElement
                    {
                        Id = "30844cc0-81af-4429-9f9e-035d78f1f9da",
                        DataType = "default",
                    },
                    Data = data,
                },
            ];
        }
        throw new InvalidOperationException("The test has neither dataModel nor dataModels");
    }

    private static Dictionary<string, JsonElement> GetCalculations(CalculationFixture testCase, string firstDataType)
    {
        var calculations = testCase.Calculations ?? throw new InvalidOperationException("The test has no calculations");
        return calculations.ValueKind == JsonValueKind.Array
            ? new() { [firstDataType] = calculations }
            : calculations.EnumerateObject().ToDictionary(p => p.Name, p => p.Value);
    }

    private static Dictionary<string, JsonNode?> GetExpects(
        CalculationFixture testCase,
        List<CalculationDataModel> dataModels
    )
    {
        var expects = JsonNode.Parse(
            testCase.Expects?.GetRawText() ?? throw new InvalidOperationException("The test has no expects")
        );
        if (testCase.DataModels is null)
        {
            return new() { [dataModels[0].DataElement.DataType] = expects };
        }
        var byDataType = expects?.AsObject() ?? throw new InvalidOperationException("expects is null");
        return dataModels.ToDictionary(
            d => d.DataElement.DataType,
            d =>
                byDataType.TryGetPropertyValue(d.DataElement.DataType, out var data)
                    ? data
                    : throw new InvalidOperationException($"expects has no {d.DataElement.DataType}")
        );
    }

    private static void AssertWarnings(List<string>? expected, List<FakeLogRecord> warnings)
    {
        expected ??= [];
        foreach (var substring in expected)
        {
            Assert.True(
                warnings.Exists(w => w.Message.Contains(substring, StringComparison.Ordinal)),
                $"Expected a warning with '{substring}'"
            );
        }
        foreach (var warning in warnings)
        {
            Assert.True(
                expected.Exists(substring => warning.Message.Contains(substring, StringComparison.Ordinal)),
                $"Unexpected warning: {warning.Message}"
            );
        }
    }

    /// <summary>The row ids in the data before the calculations, which a new row must not reuse</summary>
    private static List<string> CollectRowIds(CalculationTestModel model)
    {
        var ids = new List<string>();
        // A row can be null in the data, as targets/null-row.json checks
        foreach (var row in (model.Rows ?? []).Concat(model.Copies ?? []).OfType<CalculationTestRow>())
        {
            AddRowId(row.AltinnRowId);
            foreach (var child in (row.Children ?? []).OfType<CalculationTestChild>())
            {
                AddRowId(child.AltinnRowId);
            }
        }
        return ids;

        void AddRowId(Guid id)
        {
            if (id != Guid.Empty)
            {
                ids.Add(id.ToString());
            }
        }
    }

    /// <summary>The row ids in the data after the calculations, as serialized</summary>
    private static List<string> CollectRowIds(JsonNode? node)
    {
        var ids = new List<string>();
        void Visit(JsonNode? current)
        {
            switch (current)
            {
                case JsonObject obj:
                    foreach (var (key, value) in obj)
                    {
                        if (key == AltinnRowId && value is JsonValue id && id.TryGetValue(out string? text))
                        {
                            ids.Add(text);
                        }
                        else
                        {
                            Visit(value);
                        }
                    }
                    break;
                case JsonArray array:
                    foreach (var item in array)
                    {
                        Visit(item);
                    }
                    break;
            }
        }
        Visit(node);
        return ids;
    }

    /// <summary>
    /// Compares the data the backend calculated with the expected data. Values compare exactly, numbers by value,
    /// and <c>"&lt;new&gt;"</c> as an <c>altinnRowId</c> matches an id that is not in the input data and that no
    /// other row in the result has. A C# model
    /// cannot leave a property out, so a property the expected data leaves out must be null.
    /// </summary>
    private static void Compare(
        JsonNode? expected,
        JsonNode? actual,
        string path,
        List<string> errors,
        List<string> inputRowIds,
        List<string> actualRowIds
    )
    {
        switch (expected)
        {
            case null:
                if (actual is not null)
                {
                    errors.Add($"{path}: expected null, got {actual.ToJsonString()}");
                }
                return;
            case JsonObject expectedObject:
                if (actual is not JsonObject actualObject)
                {
                    errors.Add($"{path}: expected an object, got {actual?.ToJsonString() ?? "null"}");
                    return;
                }
                foreach (var (key, value) in expectedObject)
                {
                    if (!actualObject.TryGetPropertyValue(key, out var actualValue))
                    {
                        errors.Add($"{path}.{key}: expected {value?.ToJsonString() ?? "null"}, but it is missing");
                        continue;
                    }
                    if (key == AltinnRowId && value is JsonValue v && v.TryGetValue(out string? id) && id == NewRowId)
                    {
                        var actualId = actualValue is JsonValue a && a.TryGetValue(out string? s) ? s : null;
                        if (
                            string.IsNullOrEmpty(actualId)
                            || inputRowIds.Contains(actualId)
                            || actualRowIds.Count(rowId => rowId == actualId) != 1
                        )
                        {
                            errors.Add(
                                $"{path}.{key}: expected a new, unique row id, got {actualValue?.ToJsonString()}"
                            );
                        }
                        continue;
                    }
                    Compare(value, actualValue, $"{path}.{key}", errors, inputRowIds, actualRowIds);
                }
                foreach (var (key, value) in actualObject)
                {
                    if (!expectedObject.ContainsKey(key) && value is not null)
                    {
                        errors.Add($"{path}.{key}: expected null or missing, got {value.ToJsonString()}");
                    }
                }
                return;
            case JsonArray expectedArray:
                if (actual is not JsonArray actualArray)
                {
                    errors.Add($"{path}: expected a list, got {actual?.ToJsonString() ?? "null"}");
                    return;
                }
                if (expectedArray.Count != actualArray.Count)
                {
                    errors.Add($"{path}: expected {expectedArray.Count} items, got {actualArray.ToJsonString()}");
                    return;
                }
                for (var index = 0; index < expectedArray.Count; index++)
                {
                    Compare(
                        expectedArray[index],
                        actualArray[index],
                        $"{path}[{index}]",
                        errors,
                        inputRowIds,
                        actualRowIds
                    );
                }
                return;
            case JsonValue expectedValue:
                var kind = expectedValue.GetValueKind();
                if (actual is not JsonValue actualScalar || actualScalar.GetValueKind() != kind)
                {
                    errors.Add(
                        $"{path}: expected {expectedValue.ToJsonString()}, got {actual?.ToJsonString() ?? "null"}"
                    );
                    return;
                }
                var equal =
                    kind == JsonValueKind.Number
                        ? ParseNumber(expectedValue) == ParseNumber(actualScalar)
                        : expectedValue.ToJsonString() == actualScalar.ToJsonString();
                if (!equal)
                {
                    errors.Add($"{path}: expected {expectedValue.ToJsonString()}, got {actualScalar.ToJsonString()}");
                }
                return;
        }
    }

    private static decimal ParseNumber(JsonValue value) =>
        decimal.Parse(value.ToJsonString(), NumberStyles.Float, CultureInfo.InvariantCulture);
}
