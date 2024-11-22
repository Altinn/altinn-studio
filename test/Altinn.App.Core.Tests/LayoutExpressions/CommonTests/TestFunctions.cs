using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.CommonTests;

public class TestFunctions
{
    private readonly ITestOutputHelper _output;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public TestFunctions(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [SharedTest("and")]
    public async Task And_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("frontendSettings")]
    public async Task FrontendSettings_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("component")]
    public async Task Component_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("commaContains")]
    public async Task CommaContains_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("concat")]
    public async Task Concat_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("language")]
    public async Task Language_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("contains")]
    public async Task Contains_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("dataModel")]
    public async Task DataModel_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("dataModelMultiple")]
    public async Task DataModelMultiple_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("endsWith")]
    public async Task EndsWith_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("equals")]
    public async Task Equals_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("greaterThan")]
    public async Task GreaterThan_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("greaterThanEq")]
    public async Task GreaterThanEq_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("if")]
    public async Task If_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("not")]
    public async Task Not_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("notContains")]
    public async Task NotContains_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("instanceContext")]
    public async Task InstanceContext_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("lessThan")]
    public async Task LessThan_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("lessThanEq")]
    public async Task LessThanEq_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("notEquals")]
    public async Task NotEquals_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("or")]
    public async Task Or_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("unknown")]
    public async Task Unknown_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("upperCase")]
    public async Task UpperCase_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("lowerCase")]
    public async Task LowerCase_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("startsWith")]
    public async Task StartsWith_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("stringLength")]
    public async Task StringLength_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("round")]
    public async Task Round_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    private static async Task<ExpressionTestCaseRoot> LoadTestCase(string file, string folder)
    {
        ExpressionTestCaseRoot testCase = new();
        var data = await File.ReadAllTextAsync(Path.Join(folder, file));
        try
        {
            testCase = JsonSerializer.Deserialize<ExpressionTestCaseRoot>(data, _jsonSerializerOptions)!;
        }
        catch (Exception e)
        {
            using var jsonDocument = JsonDocument.Parse(data);

            testCase.Name = jsonDocument.RootElement.GetProperty("name").GetString();
            testCase.ExpectsFailure = jsonDocument.RootElement.TryGetProperty("expectsFailure", out var expectsFailure)
                ? expectsFailure.GetString()
                : null;
            testCase.ParsingException = e;
        }

        testCase.Filename = Path.GetFileName(file);
        testCase.FullPath = file;
        testCase.Folder = folder;
        testCase.RawJson = data;
        testCase.Instance ??= new Instance();
        return testCase;
    }

    private async Task RunTestCase(string testName, string folder)
    {
        var test = await LoadTestCase(testName, folder);
        _output.WriteLine($"{test.Filename} in {test.Folder}");
        _output.WriteLine(test.RawJson);
        _output.WriteLine(test.FullPath);

        IInstanceDataAccessor dataAccessor;
        List<DataType> dataTypes = new();
        if (test.DataModels is null)
        {
            dataTypes.Add(new DataType() { Id = "default" });
            dataAccessor = DynamicClassBuilder.DataAccessorFromJsonDocument(
                test.Instance,
                test.DataModel ?? JsonDocument.Parse("{}").RootElement
            );
        }
        else
        {
            dataTypes.AddRange(
                test.DataModels.Select(d => d.DataElement.DataType)
                    .Distinct()
                    .Select(dt => new DataType()
                    {
                        Id = dt,
                        MaxCount = 1,
                        AppLogic = new() { ClassRef = "not-in-user" },
                    })
            );
            dataAccessor = DynamicClassBuilder.DataAccessorFromJsonDocument(test.Instance, test.DataModels);
        }

        LayoutModel? componentModel = null;
        if (test.Layouts is not null)
        {
            var layout = new LayoutSetComponent(test.Layouts.Values.ToList(), "layout", dataTypes[0]);
            componentModel = new LayoutModel([layout], null);
        }
        var state = new LayoutEvaluatorState(
            dataAccessor,
            componentModel,
            test.FrontEndSettings ?? new FrontEndSettings(),
            test.GatewayAction,
            test.ProfileSettings?.Language
        );

        if (test.ExpectsFailure is not null)
        {
            if (test.ParsingException is not null)
            {
                test.ParsingException.Message.Should().Be(test.ExpectsFailure);
            }
            else
            {
                Func<Task> act = async () =>
                {
                    await ExpressionEvaluator.EvaluateExpression(
                        state,
                        test.Expression,
                        test.Context?.ToContext(componentModel, state)!
                    );
                };
                (await act.Should().ThrowAsync<Exception>()).WithMessage($"*{test.ExpectsFailure}*");
            }

            return;
        }

        test.ParsingException.Should().BeNull("Loading of test failed");

        var result = await ExpressionEvaluator.EvaluateExpression(
            state,
            test.Expression,
            test.Context?.ToContext(componentModel, state)!
        );

        switch (test.Expects.ValueKind)
        {
            case JsonValueKind.String:
                result.Should().Be(test.Expects.GetString());
                break;
            case JsonValueKind.True:
                result.Should().Be(true);
                break;
            case JsonValueKind.False:
                result.Should().Be(false);
                break;
            case JsonValueKind.Null:
                result.Should().Be(null);
                break;
            case JsonValueKind.Number:
                result.Should().Be(test.Expects.GetDouble());
                break;
            case JsonValueKind.Undefined:

            default:
                // Compare serialized json result for object and array
                JsonSerializer.Serialize(result).Should().Be(JsonSerializer.Serialize(test.Expects));
                break;
        }
    }

    [Fact]
    public void Ensure_tests_For_All_Folders()
    {
        // This is just a way to ensure that all folders have test methods associcated.
        var jsonTestFolders = Directory
            .GetDirectories(Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "functions"))
            .Where(d => Directory.GetFiles(d).Length > 0)
            .Select(d => Path.GetFileName(d))
            .OrderBy(s => s)
            .ToArray();
        var testMethods = this.GetType()
            .GetMethods()
            .Select(m =>
                m.CustomAttributes.FirstOrDefault(ca => ca.AttributeType == typeof(SharedTestAttribute))
                    ?.ConstructorArguments.FirstOrDefault()
                    .Value
            )
            .OrderBy(s => s)
            .OfType<string>()
            .OrderBy(d => d)
            .ToArray();
        testMethods.Should().Equal(jsonTestFolders, "Shared test folders should have a corresponding test method");
    }
}

public class SharedTestAttribute(string folder)
    : FileNamesInFolderDataAttribute(
        Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "functions", folder)
    ) { }
