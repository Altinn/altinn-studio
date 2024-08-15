using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.Helpers;
using Altinn.App.Core.Tests.LayoutExpressions;
using Altinn.App.Core.Tests.LayoutExpressions.CommonTests;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class ExpressionValidatorTests
{
    private readonly ITestOutputHelper _output;
    private readonly ExpressionValidator _validator;
    private readonly Mock<ILogger<ExpressionValidator>> _logger = new();
    private readonly Mock<IAppResources> _appResources = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly Mock<IDataClient> _dataClient = new(MockBehavior.Strict);
    private readonly IOptions<FrontEndSettings> _frontendSettings = Microsoft.Extensions.Options.Options.Create(
        new FrontEndSettings()
    );
    private readonly Mock<ILayoutEvaluatorStateInitializer> _layoutInitializer = new(MockBehavior.Strict);
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { WriteIndented = true };

    public ExpressionValidatorTests(ITestOutputHelper output)
    {
        _output = output;
        _appMetadata
            .Setup(ar => ar.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("org/app") { DataTypes = new List<DataType> { new() { Id = "default" } } }
            );
        _appResources.Setup(ar => ar.GetLayoutSetForTask("Task_1")).Returns(new LayoutSet());
        _validator = new ExpressionValidator(_logger.Object, _appResources.Object, _layoutInitializer.Object);
    }

    public ExpressionValidationTestModel LoadData(string fileName, string folder)
    {
        var data = File.ReadAllText(Path.Join(folder, fileName));
        return JsonSerializer.Deserialize<ExpressionValidationTestModel>(data, _jsonSerializerOptions)!;
    }

    [Theory]
    [FileNamesInFolderData("Features/Validators/expression-validation-tests/backend")]
    public async Task RunExpressionValidationTestsForBackend(string fileName, string folder)
    {
        await RunExpressionValidationTest(fileName, folder);
    }

    [Theory]
    [FileNamesInFolderData(["Features", "Validators", "expression-validation-tests", "shared"])]
    public async Task RunExpressionValidationTestsForShared(string fileName, string folder)
    {
        await RunExpressionValidationTest(fileName, folder);
    }

    private async Task RunExpressionValidationTest(string fileName, string folder)
    {
        var testCase = LoadData(fileName, folder);

        var instance = new Instance() { Process = new() { CurrentTask = new() { ElementId = "Task_1", } } };
        var dataElement = new DataElement { DataType = "default", };

        var dataModel = DynamicClassBuilder.DataModelFromJsonDocument(testCase.FormData, dataElement);

        var evaluatorState = new LayoutEvaluatorState(dataModel, testCase.Layouts, _frontendSettings.Value, instance);
        _layoutInitializer
            .Setup(init =>
                init.Init(It.Is<Instance>(i => i == instance), "Task_1", It.IsAny<string>(), It.IsAny<string?>())
            )
            .ReturnsAsync(evaluatorState);
        _appResources
            .Setup(ar => ar.GetValidationConfiguration("default"))
            .Returns(JsonSerializer.Serialize(testCase.ValidationConfig));
        _appResources.Setup(ar => ar.GetLayoutSetForTask(null!)).Returns(new LayoutSet() { DataType = "default", });

        var validationIssues = await _validator.ValidateFormData(instance, dataElement, null!, null);

        var result = validationIssues.Select(i => new
        {
            Message = i.CustomTextKey,
            Severity = i.Severity,
            Field = i.Field,
        });

        var expected = testCase.Expects.Select(e => new
        {
            Message = e.Message,
            Severity = e.Severity,
            Field = e.Field,
        });

        result.Should().BeEquivalentTo(expected);
    }
}

public record ExpressionValidationTestModel
{
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("expects")]
    public required ExpectedObject[] Expects { get; set; }

    [JsonPropertyName("validationConfig")]
    public required JsonElement ValidationConfig { get; set; }

    [JsonPropertyName("formData")]
    public required JsonElement FormData { get; set; }

    [JsonPropertyName("layouts")]
    [JsonConverter(typeof(LayoutModelConverterFromObject))]
    public required LayoutModel Layouts { get; set; }

    public class ExpectedObject
    {
        [JsonPropertyName("message")]
        public required string Message { get; set; }

        [JsonPropertyName("severity")]
        [JsonConverter(typeof(FrontendSeverityConverter))]
        public required ValidationIssueSeverity Severity { get; set; }

        [JsonPropertyName("field")]
        public required string Field { get; set; }

        [JsonPropertyName("componentId")]
        public required string ComponentId { get; set; }
    }
}
