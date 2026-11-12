using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Calculation;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Tests.LayoutExpressions.CommonTests;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;
using IAppResources = Altinn.App.Core.Internal.App.IAppResources;

namespace Altinn.App.Core.Tests.Features.DataProcessing;

public sealed class DataModelFieldCalculatorTests
{
    const string TaskId = "Task_1";
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

    private readonly DataElement _defaultSingleDataElement = new DataElement
    {
        Id = "30844cc0-81af-4429-9f9e-035d78f1f9da",
        DataType = "default",
    };

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
                      "calculations": [
                          {
                            "field": "form.formDataWrapperThrows",
                            "expression": ["noneExistingExpression"]
                          }
                      ]
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

        var dataAccessor = Setup(testCase);

        var exception = await Assert.ThrowsAsync<ExpressionEvaluatorTypeErrorException>(() =>
            _dataModelFieldCalculator.Calculate(dataAccessor, TaskId)
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
        var testCase = await LoadData(fileName, folder);

        var dataAccessor = Setup(testCase);

        await _dataModelFieldCalculator.Calculate(dataAccessor, TaskId);

        foreach (var expected in testCase.Expects)
        {
            Assert.Contains(expected.LogMessage, _logger.Collector.GetSnapshot().Select(x => x.Message));
        }
    }

    [Theory]
    [FileNamesInFolderData(["Features", "DataProcessing", "data-field-value-calculator-tests"])]
    public async Task RunDataModelFieldCalculationTests(string fileName, string folder)
    {
        var testCase = await LoadData(fileName, folder);

        var dataAccessor = Setup(testCase);

        await _dataModelFieldCalculator.Calculate(dataAccessor, TaskId);
        Assert.Empty(_logger.Collector.GetSnapshot());

        foreach (var expected in testCase.Expects)
        {
            var dataElementIdentifier = expected.DataElementIdentifier ?? _defaultSingleDataElement;
            if (expected.Result.HasValue)
            {
                var formDataWrapper = await dataAccessor.GetFormDataWrapper(dataElementIdentifier);
                var value = formDataWrapper.Get(expected.Field);
                Assert.Equal(JsonSerializer.Serialize(expected.Result.Value), JsonSerializer.Serialize(value));
                Assert.Empty(_logger.Collector.GetSnapshot());
            }
            else
            {
                Assert.Fail($"Expected result for field {expected.Field} not found");
            }
        }
    }

    private IInstanceDataAccessor Setup(DataModelFieldCalculatorTestModel testCase)
    {
        var instance = new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "org/app",
            Process = new() { CurrentTask = new() { ElementId = TaskId } },
        };
        var translationService = new TranslationService(
            new AppIdentifier("org", "app"),
            _appResources.Object,
            FakeLoggerXunit.Get<TranslationService>(_output)
        );

        _appResources
            .Setup(ar => ar.GetTexts("org", "app", "nb"))
            .ReturnsAsync(
                testCase.TextResources is null
                    ? null
                    : new TextResource { Language = "nb", Resources = testCase.TextResources }
            );
        _appResources.Setup(ar => ar.GetCalculationSchema(It.IsAny<string>())).Returns(testCase.CalculationConfig);

        if (testCase.DataModels is not null)
        {
            Assert.Null(testCase.FormData);
            Assert.All(testCase.Expects, e => Assert.NotNull(e.DataElementIdentifier));
            Assert.All(testCase.DataModels, d => Assert.NotNull(d.DataElement.DataType));
            var dataTypes = testCase
                .DataModels.Select(d => d.DataElement.DataType)
                .Distinct()
                .Select(dataTypeId => new DataType()
                {
                    Id = dataTypeId,
                    MaxCount = 1,
                    AppLogic = new() { },
                    TaskId = TaskId,
                })
                .ToList();

            var layout = new UiFolderComponent(testCase.Layouts, "layout", dataTypes[0]);
            var componentModel = new LayoutModel([layout], null);

            return DynamicClassBuilder.DataAccessorFromJsonDocument(
                instance,
                translationService,
                componentModel,
                _frontendSettings.Value,
                testCase.DataModels,
                gatewayAction: null,
                language: null
            );
        }
        else
        {
            var dataType = new DataType() { Id = "default", TaskId = TaskId };
            var layout = new UiFolderComponent(testCase.Layouts, "layout", dataType);
            var componentModel = new LayoutModel([layout], null);
            return DynamicClassBuilder.DataAccessorFromJsonDocument(
                instance,
                translationService,
                componentModel,
                _frontendSettings.Value,
                testCase.FormData ?? throw new InvalidOperationException("Either formData or dataModels must be set"),
                gatewayAction: null,
                language: null,
                _defaultSingleDataElement
            );
        }
    }

    private record DataModelFieldCalculatorTestModel
    {
        [JsonPropertyName("name")]
        public required string Name { get; set; }

        [JsonPropertyName("expects")]
        public required Expected[] Expects { get; set; }

        [JsonPropertyName("calculationConfig")]
        public required CalculationSchema CalculationConfig { get; set; }

        // A single data element. Either this or <see cref="DataModels"/> must be set.
        [JsonPropertyName("formData")]
        public JsonElement? FormData { get; set; }

        // Multiple data elements. The calculation runs against every element whose data type has a calculation config,
        // and expressions may reference the other data models. Either this or <see cref="FormData"/> must be set.
        [JsonPropertyName("dataModels")]
        public List<DataModelAndElement>? DataModels { get; set; }

        [JsonPropertyName("layouts")]
        public required IReadOnlyDictionary<string, JsonElement> Layouts { get; set; }

        [JsonPropertyName("textResources")]
        public List<TextResourceElement>? TextResources { get; set; }
    }

    private record Expected
    {
        public DataElementIdentifier? DataElementIdentifier { get; set; }

        public string? Field { get; set; }

        public ExpressionValue? Result { get; set; }

        public string? LogMessage { get; set; }
    }
}
