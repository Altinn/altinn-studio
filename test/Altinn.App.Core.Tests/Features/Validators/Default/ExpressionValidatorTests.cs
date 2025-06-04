using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.LayoutExpressions.CommonTests;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class ExpressionValidatorTests
{
    private readonly ITestOutputHelper _output;
    private readonly ExpressionValidator _validator;
    private readonly Mock<ILogger<ExpressionValidator>> _logger = new();
    private readonly Mock<IAppResources> _appResources = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly IOptions<FrontEndSettings> _frontendSettings = Microsoft.Extensions.Options.Options.Create(
        new FrontEndSettings()
    );
    private readonly Mock<ILayoutEvaluatorStateInitializer> _layoutInitializer = new(MockBehavior.Strict);
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public ExpressionValidatorTests(ITestOutputHelper output)
    {
        _output = output;
        _validator = new ExpressionValidator(
            _logger.Object,
            _appResources.Object,
            _layoutInitializer.Object,
            _appMetadata.Object
        );
    }

    public async Task<ExpressionValidationTestModel> LoadData(string fileName, string folder)
    {
        var data = await File.ReadAllTextAsync(Path.Join(folder, fileName));
        _output.WriteLine(data);
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
        var testCase = await LoadData(fileName, folder);

        var instance = new Instance() { Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d", AppId = "org/app" };
        var dataElement = new DataElement { DataType = "default" };
        var dataType = new DataType() { Id = "default" };
        var appMedatada = new ApplicationMetadata("org/app") { DataTypes = [dataType] };

        var dataModel = DynamicClassBuilder.DataAccessorFromJsonDocument(instance, testCase.FormData, dataElement);

        var layout = new LayoutSetComponent(testCase.Layouts.Values.ToList(), "layout", dataType);
        var componentModel = new LayoutModel([layout], null);
        var translationService = new TranslationService(
            new AppIdentifier("org", "app"),
            _appResources.Object,
            FakeLoggerXunit.Get<TranslationService>(_output)
        );
        var evaluatorState = new LayoutEvaluatorState(
            dataModel,
            componentModel,
            translationService,
            _frontendSettings.Value
        );
        _layoutInitializer
            .Setup(init =>
                init.Init(It.IsAny<IInstanceDataAccessor>(), "Task_1", It.IsAny<string?>(), It.IsAny<string?>())
            )
            .ReturnsAsync(evaluatorState);

        _appResources
            .Setup(ar => ar.GetTexts("org", "app", "nb"))
            .ReturnsAsync(
                testCase.TextResources is null
                    ? null
                    : new TextResource { Language = "nb", Resources = testCase.TextResources }
            );

        var dataAccessor = new InstanceDataAccessorFake(instance, appMedatada) { { dataElement, dataModel } };

        var validationIssues = await _validator.ValidateFormData(
            dataElement,
            dataAccessor,
            JsonSerializer.Serialize(testCase.ValidationConfig),
            "Task_1",
            null
        );

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
    public required IReadOnlyDictionary<string, PageComponent> Layouts { get; set; }

    [JsonPropertyName("textResources")]
    public List<TextResourceElement>? TextResources { get; set; }

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
