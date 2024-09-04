using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.Helpers;
using Altinn.App.Core.Tests.TestUtils;
using FluentAssertions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions;

public class TestFunctions
{
    private readonly ITestOutputHelper _output;

    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { ReadCommentHandling = JsonCommentHandling.Skip, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public TestFunctions(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [SharedTest("and")]
    public void And_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("frontendSettings")]
    public void FrontendSettings_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("component")]
    public void Component_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("commaContains")]
    public void CommaContains_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("concat")]
    public void Concat_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("contains")]
    public void Contains_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("dataModel")]
    public void DataModel_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("endsWith")]
    public void EndsWith_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("equals")]
    public void Equals_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("greaterThan")]
    public void GreaterThan_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("greaterThanEq")]
    public void GreaterThanEq_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("if")]
    public void If_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("not")]
    public void Not_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("notContains")]
    public void NotContains_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("instanceContext")]
    public void InstanceContext_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("lessThan")]
    public void LessThan_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("lessThanEq")]
    public void LessThanEq_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("notEquals")]
    public void NotEquals_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("or")]
    public void Or_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("unknown")]
    public void Unknown_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("upperCase")]
    public void UpperCase_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("lowerCase")]
    public void LowerCase_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("startsWith")]
    public void StartsWith_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("stringLength")]
    public void StringLength_Theory(string testName, string folder) => RunTestCase(testName, folder);

    [Theory]
    [SharedTest("round")]
    public void Round_Theory(string testName, string folder) => RunTestCase(testName, folder);

    private static ExpressionTestCaseRoot LoadTestCase(string file, string folder)
    {
        ExpressionTestCaseRoot testCase = new();
        var data = File.ReadAllText(Path.Join(folder, file));
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
        return testCase;
    }

    private void RunTestCase(string testName, string folder)
    {
        var test = LoadTestCase(testName, folder);
        _output.WriteLine($"{test.Filename} in {test.Folder}");
        _output.WriteLine(test.RawJson);
        _output.WriteLine(test.FullPath);
        var state = new LayoutEvaluatorState(
            new JsonDataModel(test.DataModel),
            test.ComponentModel,
            test.FrontEndSettings ?? new(),
            test.Instance ?? new()
        );

        if (test.ExpectsFailure is not null)
        {
            if (test.ParsingException is not null)
            {
                test.ParsingException.Message.Should().Be(test.ExpectsFailure);
            }
            else
            {
                Action act = () =>
                {
                    ExpressionEvaluator.EvaluateExpression(
                        state,
                        test.Expression,
                        test.Context?.ToContext(test.ComponentModel)!
                    );
                };
                act.Should().Throw<Exception>().WithMessage(test.ExpectsFailure);
            }

            return;
        }

        test.ParsingException.Should().BeNull("Loading of test failed");

        var result = ExpressionEvaluator.EvaluateExpression(
            state,
            test.Expression,
            test.Context?.ToContext(test.ComponentModel)!
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
            .ToArray();
        testMethods
            .Should()
            .BeEquivalentTo(jsonTestFolders, "Shared test folders should have a corresponding test method");
    }
}

public class SharedTestAttribute(string folder)
    : FileNamesInFolderDataAttribute(
        Path.Join("LayoutExpressions", "CommonTests", "shared-tests", "functions", folder)
    ) { }
