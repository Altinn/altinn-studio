using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.CommonTests;

public class TestBackendExclusiveFunctions
{
    private readonly ITestOutputHelper _output;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public TestBackendExclusiveFunctions(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [ExclusiveTest("gatewayAction")]
    public async Task GatewayAction_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    private static async Task<ExpressionTestCaseRoot> LoadTestCase(string testName, string folder)
    {
        var file = Path.Join(folder, testName);

        ExpressionTestCaseRoot testCase = new();
        var data = await File.ReadAllTextAsync(file);
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

    private async Task RunTestCase(string testName, string folder)
    {
        var test = await LoadTestCase(testName, folder);
        _output.WriteLine($"{test.Filename} in {test.Folder}");
        _output.WriteLine(test.RawJson);
        _output.WriteLine(test.FullPath);
        var dataType = new DataType() { Id = "default" };
        var layout = new LayoutSetComponent(test.Layouts!, "layout", dataType);
        var componentModel = new LayoutModel([layout], null);
        var state = new LayoutEvaluatorState(
            DynamicClassBuilder.DataAccessorFromJsonDocument(
                test.Instance,
                test.DataModel ?? JsonDocument.Parse("{}").RootElement
            ),
            componentModel,
            null!,
            test.FrontEndSettings ?? new(),
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
                        await test.GetContextOrNull(state)
                    );
                };
                (await act.Should().ThrowAsync<Exception>()).WithMessage(test.ExpectsFailure);
            }

            return;
        }

        test.ParsingException.Should().BeNull("Loading of test failed");

        var result = await ExpressionEvaluator.EvaluateExpression(
            state,
            test.Expression,
            await test.GetContextOrNull(state)!
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
            .GetDirectories(
                Path.Join(
                    PathUtils.GetCoreTestsPath(),
                    "LayoutExpressions",
                    "CommonTests",
                    "exclusive-tests",
                    "functions"
                )
            )
            .Select(d => Path.GetFileName(d))
            .ToArray();
        var testMethods = this.GetType()
            .GetMethods()
            .Select(m =>
                m.CustomAttributes.FirstOrDefault(ca => ca.AttributeType == typeof(ExclusiveTestAttribute))
                    ?.ConstructorArguments.FirstOrDefault()
                    .Value
            )
            .OfType<string>()
            .ToArray();
        testMethods
            .Should()
            .BeEquivalentTo(jsonTestFolders, "Shared test folders should have a corresponding test method");
    }
}

public class ExclusiveTestAttribute(string folder)
    : FileNamesInFolderDataAttribute(
        Path.Join("LayoutExpressions", "CommonTests", "exclusive-tests", "functions", folder)
    ) { }
