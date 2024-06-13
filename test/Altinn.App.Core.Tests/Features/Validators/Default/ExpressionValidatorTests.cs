using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.Helpers;
using Altinn.App.Core.Tests.LayoutExpressions;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class ExpressionValidatorTests
{
    private readonly ExpressionValidator _validator;
    private readonly Mock<ILogger<ExpressionValidator>> _logger = new();
    private readonly Mock<IAppResources> _appResources = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadata = new(MockBehavior.Strict);
    private readonly IOptions<FrontEndSettings> _frontendSettings = Microsoft.Extensions.Options.Options.Create(
        new FrontEndSettings()
    );
    private readonly Mock<LayoutEvaluatorStateInitializer> _layoutInitializer;

    public ExpressionValidatorTests()
    {
        _appMetadata
            .Setup(ar => ar.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = new List<DataType>() { new() { } } });
        _appResources.Setup(ar => ar.GetLayoutSetForTask(It.IsAny<string>())).Returns(new LayoutSet());
        _layoutInitializer = new(MockBehavior.Strict, _appResources.Object, _frontendSettings) { CallBase = false };
        _validator = new ExpressionValidator(
            _logger.Object,
            _appResources.Object,
            _layoutInitializer.Object,
            _appMetadata.Object
        );
    }

    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new() { ReadCommentHandling = JsonCommentHandling.Skip, PropertyNamingPolicy = JsonNamingPolicy.CamelCase, };

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
        var instance = new Instance();
        var dataElement = new DataElement();

        var dataModel = new JsonDataModel(testCase.FormData);

        var evaluatorState = new LayoutEvaluatorState(dataModel, testCase.Layouts, _frontendSettings.Value, instance);
        _layoutInitializer
            .Setup(init =>
                init.Init(
                    It.Is<Instance>(i => i == instance),
                    It.IsAny<object>(),
                    It.IsAny<string>(),
                    It.IsAny<string>()
                )
            )
            .ReturnsAsync(evaluatorState);
        _appResources
            .Setup(ar => ar.GetValidationConfiguration(It.IsAny<string>()))
            .Returns(JsonSerializer.Serialize(testCase.ValidationConfig));

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

public class ExpressionValidationTestModel
{
    public required string Name { get; set; }

    public required ExpectedObject[] Expects { get; set; }

    public required JsonElement ValidationConfig { get; set; }

    public required JsonObject FormData { get; set; }

    [JsonConverter(typeof(LayoutModelConverterFromObject))]
    public required LayoutModel Layouts { get; set; }

    public class ExpectedObject
    {
        public required string Message { get; set; }

        [JsonConverter(typeof(FrontendSeverityConverter))]
        public required ValidationIssueSeverity Severity { get; set; }

        public required string Field { get; set; }

        public required string ComponentId { get; set; }
    }
}
