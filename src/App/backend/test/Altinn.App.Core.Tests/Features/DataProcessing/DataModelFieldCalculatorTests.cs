using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;
using IAppResources = Altinn.App.Core.Internal.App.IAppResources;

namespace Altinn.App.Core.Tests.Features.DataProcessing;

public sealed class DataModelFieldCalculatorTests
{
    private readonly ITestOutputHelper _output;
    private readonly DataModelFieldCalculator _dataModelFieldCalculator;
    private readonly FakeLogger<DataModelFieldCalculator> _logger = new();
    private readonly Mock<IAppResources> _appResources = new(MockBehavior.Strict);
    private readonly IOptions<FrontEndSettings> _frontendSettings = Microsoft.Extensions.Options.Options.Create(
        new FrontEndSettings()
    );
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private DataElement _dataElement = null!;
    private IInstanceDataAccessor _instanceDataAccessor = null!;

    public DataModelFieldCalculatorTests(ITestOutputHelper output)
    {
        var dataElementAccessChecker = new Mock<IDataElementAccessChecker>();
        dataElementAccessChecker.Setup(x => x.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>())).ReturnsAsync(true);

        var telemetry = new TelemetrySink();

        _output = output;
        _dataModelFieldCalculator = new DataModelFieldCalculator(
            _logger,
            _appResources.Object,
            dataElementAccessChecker.Object,
            telemetry.Object
        );
    }

    private async Task<DataModelFieldCalculatorTestModel> LoadData(string fileName, string folder)
    {
        var data = await File.ReadAllTextAsync(Path.Join(folder, fileName));
        _output.WriteLine(data);
        return JsonSerializer.Deserialize<DataModelFieldCalculatorTestModel>(data, _jsonSerializerOptions)!;
    }

    [Fact]
    public async Task ShouldLogErrorAndThrowWhenExpressionEvaluatorThrowsException()
    {
        var testCaseJson = """
                {
                  "name": "Should log error and throw when ExpressionEvaluator throws exception",
                  "expects": [
                      {
                          "logMessage": "Error while evaluating calculation for field form.formDataWrapperThrows"
                      }
                  ],
                  "calculationConfig": {
                      "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/calculation/calculation.schema.v1.json",
                      "calculations": {
                          "form.formDataWrapperThrows": {
                            "expression": ["noneExistingExpression"]
                          }
                      }
                  },
                  "formData": {
                      "form": {
                          "formDataWrapperThrows": true
                      }
                  },
                  "layouts": {}
                }
            """;
        _output.WriteLine(testCaseJson);
        var testCase = JsonSerializer.Deserialize<DataModelFieldCalculatorTestModel>(
            testCaseJson,
            _jsonSerializerOptions
        )!;

        Setup(testCase);

        var exception = await Assert.ThrowsAsync<ExpressionEvaluatorTypeErrorException>(() =>
            _dataModelFieldCalculator.CalculateFormData(
                _instanceDataAccessor,
                _dataElement,
                JsonSerializer.Serialize(testCase.CalculationConfig)
            )
        );

        Assert.Contains(testCase.Expects.First().LogMessage, _logger.Collector.GetSnapshot().Select(x => x.Message));
        Assert.Contains(
            $"Function \"noneExistingExpression\" not implemented in backend [\"noneExistingExpression\"]",
            exception.Message
        );
    }

    [Theory]
    [FileNamesInFolderData(["Features", "DataProcessing", "data-field-value-calculator-tests", "assert-logger"])]
    public async Task RunDataModelFieldCalculationTestsThatAssertLogger(string fileName, string folder)
    {
        var (_, testCase) = await RunDataModelFieldCalculatorTest(fileName, folder);

        foreach (var expected in testCase.Expects)
        {
            Assert.Contains(expected.LogMessage, _logger.Collector.GetSnapshot().Select(x => x.Message));
        }
    }

    [Theory]
    [FileNamesInFolderData(["Features", "DataProcessing", "data-field-value-calculator-tests"])]
    public async Task RunDataModelFieldCalculationTests(string fileName, string folder)
    {
        var (result, testCase) = await RunDataModelFieldCalculatorTest(fileName, folder);

        foreach (var expected in testCase.Expects)
        {
            if (expected.Result.HasValue)
            {
                Assert.Equal(expected.Result.Value.ToObject(), result.Get(expected.Field));
                Assert.Empty(_logger.Collector.GetSnapshot());
            }
            else
            {
                Assert.Fail($"Expected result for field {expected.Field} not found");
            }
        }
    }

    private async Task<(IFormDataWrapper, DataModelFieldCalculatorTestModel)> RunDataModelFieldCalculatorTest(
        string fileName,
        string folder
    )
    {
        var testCase = await LoadData(fileName, folder);

        Setup(testCase);

        await _dataModelFieldCalculator.CalculateFormData(
            _instanceDataAccessor,
            _dataElement,
            JsonSerializer.Serialize(testCase.CalculationConfig)
        );

        var formDataWrapper = await _instanceDataAccessor.GetFormDataWrapper(_dataElement);

        return (formDataWrapper, testCase);
    }

    private void Setup(DataModelFieldCalculatorTestModel testCase)
    {
        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "org/app" };
        var dataType = new DataType() { Id = "default" };

        _dataElement = new DataElement { Id = "30844cc0-81af-4429-9f9e-035d78f1f9da", DataType = "default" };
        var layout = new UiFolderComponent(testCase.Layouts, "layout", dataType);
        var componentModel = new LayoutModel([layout], null);
        var translationService = new TranslationService(
            new AppIdentifier("org", "app"),
            _appResources.Object,
            FakeLoggerXunit.Get<TranslationService>(_output)
        );
        _instanceDataAccessor = DynamicClassBuilder.DataAccessorFromJsonDocument(
            instance,
            translationService,
            componentModel,
            new FrontEndSettings(),
            testCase.FormData,
            gatewayAction: null,
            language: null,
            _dataElement
        );

        _appResources
            .Setup(ar => ar.GetTexts("org", "app", "nb"))
            .ReturnsAsync(
                testCase.TextResources is null
                    ? null
                    : new TextResource { Language = "nb", Resources = testCase.TextResources }
            );
    }

    private record DataModelFieldCalculatorTestModel
    {
        [JsonPropertyName("name")]
        public required string Name { get; set; }

        [JsonPropertyName("expects")]
        public required Expected[] Expects { get; set; }

        [JsonPropertyName("calculationConfig")]
        public required JsonElement CalculationConfig { get; set; }

        [JsonPropertyName("formData")]
        public required JsonElement FormData { get; set; }

        [JsonPropertyName("layouts")]
        public required IReadOnlyDictionary<string, JsonElement> Layouts { get; set; }

        [JsonPropertyName("textResources")]
        public List<TextResourceElement>? TextResources { get; set; }
    }

    private record Expected
    {
        public string? Field { get; set; }

        public ExpressionValue? Result { get; set; }

        public string? LogMessage { get; set; }
    }
}
