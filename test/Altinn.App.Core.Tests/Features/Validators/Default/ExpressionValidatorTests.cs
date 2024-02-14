using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.Helpers;
using Altinn.App.Core.Tests.LayoutExpressions;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class ExpressionValidatorTests
{
    private readonly ExpressionValidator _validator;
    private readonly Mock<ILogger<ExpressionValidator>> _logger = new();
    private readonly Mock<IAppResources> _appResources = new(MockBehavior.Strict);
    private readonly IOptions<FrontEndSettings> _frontendSettings = Options.Create(new FrontEndSettings());
    private readonly Mock<LayoutEvaluatorStateInitializer> _layoutInitializer;

    public ExpressionValidatorTests()
    {
        _layoutInitializer = new(MockBehavior.Strict, _appResources.Object, _frontendSettings) { CallBase = false };
        _validator =
            new ExpressionValidator(_logger.Object, _appResources.Object, _layoutInitializer.Object);
    }

    [Theory]
    [ExpressionTest]
    public async Task RunExpressionValidationTest(ExpressionValidationTestModel testCase)
    {
        var instance = new Instance();
        var dataElement = new DataElement();

        var dataModel = new JsonDataModel(testCase.FormData);

        var evaluatorState = new LayoutEvaluatorState(dataModel, testCase.Layouts, _frontendSettings.Value, instance);
        _layoutInitializer
            .Setup(init => init.Init(It.Is<Instance>(i => i == instance), It.IsAny<object>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(evaluatorState);
        _appResources
            .Setup(ar => ar.GetValidationConfiguration(null))
            .Returns(JsonSerializer.Serialize(testCase.ValidationConfig));

        LayoutEvaluator.RemoveHiddenData(evaluatorState, RowRemovalOption.SetToNull);
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

public class ExpressionTestAttribute : DataAttribute
{
    private static readonly JsonSerializerOptions JsonSerializerOptions = new JsonSerializerOptions
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public override IEnumerable<object[]> GetData(MethodInfo methodInfo)
    {
        var files = Directory.GetFiles(Path.Join("Features", "Validators", "shared-expression-validation-tests"));

        foreach (var file in files)
        {
            var data = File.ReadAllText(file);
            ExpressionValidationTestModel testCase = JsonSerializer.Deserialize<ExpressionValidationTestModel>(
                data,
                JsonSerializerOptions)!;
            yield return new object[] { testCase };
        }
    }
}

public class ExpressionValidationTestModel
{
    public string Name { get; set; }

    public ExpectedObject[] Expects { get; set; }

    public JsonElement ValidationConfig { get; set; }

    public JsonObject FormData { get; set; }

    [JsonConverter(typeof(LayoutModelConverterFromObject))]
    public LayoutModel Layouts { get; set; }

    public class ExpectedObject
    {
        public string Message { get; set; }

        [JsonConverter(typeof(FrontendSeverityConverter))]
        public ValidationIssueSeverity Severity { get; set; }

        public string Field { get; set; }

        public string ComponentId { get; set; }
    }
}
