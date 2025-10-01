using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Moq;
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
    [SharedTest("argv")]
    public async Task Argv_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("and")]
    public async Task And_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("formatDate")]
    public async Task FormatDate_Theory(string testName, string folder) => await RunTestCase(testName, folder);

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
    [SharedTest("compare-equals")]
    public async Task CompareEquals_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("compare-error")]
    public async Task CompareError_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("compare-greaterThan")]
    public async Task CompareGreaterThan_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("compare-isAfter")]
    public async Task CompareIsAfter_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("compare-isAfterEq")]
    public async Task CompareIsAfterEq_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("compare-isBefore")]
    public async Task CompareIsBefore_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("compare-isBeforeEq")]
    public async Task CompareIsBeforeEq_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("compare-isSameDay")]
    public async Task CompareIsSameDay_Theory(string testName, string folder) => await RunTestCase(testName, folder);

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
    [SharedTest("countDataElements")]
    public async Task CountDataElements_Theory(string testName, string folder) => await RunTestCase(testName, folder);

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
    [SharedTest("text")]
    public async Task Text_Theory(string testName, string folder) => await RunTestCase(testName, folder);

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
    [SharedTest("upperCaseFirst")]
    public async Task UpperCaseFirst_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("lowerCaseFirst")]
    public async Task LowerCaseFirst_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("stringSlice")]
    public async Task StringSlice_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("stringReplace")]
    public async Task StringReplace_Theory(string testName, string folder) => await RunTestCase(testName, folder);

    [Theory]
    [SharedTest("stringIndexOf")]
    public async Task StringIndexOf_Theory(string testName, string folder) => await RunTestCase(testName, folder);

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
        _output.WriteLine(test.Name);
        _output.WriteLine($"{test.Folder}{Path.DirectorySeparatorChar}{test.Filename}");
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

        var positionalArguments = test
            .PositionalArguments?.Select<JsonElement, object?>(e =>
                e.ValueKind switch
                {
                    JsonValueKind.String => e.GetString(),
                    JsonValueKind.Number => e.GetDouble(),
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Null => null,
                    _ => throw new NotImplementedException($"JsonElement value kind {e.ValueKind} not implemented"),
                }
            )
            .ToArray();

        LayoutModel? componentModel = null;
        if (test.Layouts is not null)
        {
            var layout = new LayoutSetComponent(test.Layouts, "layout", dataTypes[0]);
            componentModel = new LayoutModel([layout], null);
        }
        else if (test.Layouts is null && dataTypes.Count > 0)
        {
            // Create a working dummy layout to avoid null reference exceptions and make dataModel lookups work.
            using var document = JsonDocument.Parse(
                """
                {
                    "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                    "data": {
                        "layout":[
                            {
                                "id": "myParagraph",
                                "type": "paragraph"
                            }
                        ]
                    }
                }
                """
            );
            var pageId = "page";
            var layoutId = "layout";

            var layout = new LayoutSetComponent(
                [PageComponent.Parse(document.RootElement, pageId, layoutId)],
                layoutId,
                dataTypes[0]
            );
            componentModel = new LayoutModel([layout], null);
        }

        var appRewourcesMock = new Mock<IAppResources>(MockBehavior.Strict);

        var language = test.ProfileSettings?.Language ?? "nb";
        appRewourcesMock
            .Setup(ar => ar.GetTexts(It.IsAny<string>(), It.IsAny<string>(), language))
            .ReturnsAsync(new TextResource() { Resources = test.TextResources ?? [] });

        var translationService = new TranslationService(
            new Core.Models.AppIdentifier("org", "app"),
            appRewourcesMock.Object,
            FakeLoggerXunit.Get<TranslationService>(_output)
        );

        var state = new LayoutEvaluatorState(
            dataAccessor,
            componentModel,
            translationService,
            test.FrontEndSettings ?? new FrontEndSettings(),
            test.GatewayAction,
            language,
            TimeZoneInfo.Utc // Frontend uses UTC when formating dates
        );

        ComponentContext? context = null;
        if (test.Context is not null)
        {
            context = await test.GetContextOrNull(state);
        }
        else if (componentModel is not null)
        {
            context = (await componentModel.GenerateComponentContexts(state)).First();
        }

        if (test.ExpectsFailure is not null && test.ParsingException is not null)
        {
            test.ParsingException.Message.Should().Be(test.ExpectsFailure);
            return;
        }

        test.ParsingException.Should().BeNull("Loading of test failed");

        await RunTestCaseItem(
            new ExpressionTestCaseRoot.TestCaseItem()
            {
                Expects = test.Expects,
                Expression = test.Expression,
                ExpectsFailure = test.ExpectsFailure,
            },
            state,
            context,
            positionalArguments
        );

        if (test.TestCases != null)
        {
            foreach (var testCase in test.TestCases)
            {
                await RunTestCaseItem(testCase, state, context, positionalArguments);
            }
        }
    }

    private async Task RunTestCaseItem(
        ExpressionTestCaseRoot.TestCaseItem test,
        LayoutEvaluatorState state,
        ComponentContext? context,
        object?[]? positionalArguments
    )
    {
        if (test.ExpectsFailure is not null)
        {
            _output.WriteLine($"Expecting failure: {test.ExpectsFailure}");
            _output.WriteLine($"Expression: {test.Expression}");
            _output.WriteLine("");
            Func<Task> act = async () =>
            {
                var evaluationResult = await ExpressionEvaluator.EvaluateExpression(
                    state,
                    test.Expression,
                    context!,
                    positionalArguments
                );
                _output.WriteLine($"Unexpected result: {evaluationResult}");
            };
            (await act.Should().ThrowAsync<Exception>()).WithMessage($"*{test.ExpectsFailure}*");

            return;
        }

        _output.WriteLine($"Expecting success: {test.Expects}");
        _output.WriteLine($"Expression: {test.Expression}");
        _output.WriteLine("");
        var result = await ExpressionEvaluator.EvaluateExpression(
            state,
            test.Expression,
            context!,
            positionalArguments
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
                Path.Join(PathUtils.GetCoreTestsPath(), "LayoutExpressions", "CommonTests", "shared-tests", "functions")
            )
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
