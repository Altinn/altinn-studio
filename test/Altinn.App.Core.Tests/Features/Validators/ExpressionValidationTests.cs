using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.Helpers;
using Altinn.App.Core.Tests.LayoutExpressions;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Xunit.Sdk;

namespace Altinn.App.Core.Tests.Features.Validators;

public class ExpressionValidationTests
{
    [Theory]
    [ExpressionTest]
    public void RunExpressionValidationTest(ExpressionValidationTestModel testCase)
    {
        var logger = Mock.Of<ILogger<ValidationAppSI>>();
        var dataModel = new JsonDataModel(testCase.FormData);
        var evaluatorState = new LayoutEvaluatorState(dataModel, testCase.Layouts, new(), new());

        LayoutEvaluator.RemoveHiddenData(evaluatorState, RowRemovalOption.SetToNull);
        var validationIssues = ExpressionValidator.Validate(testCase.ValidationConfig, dataModel, evaluatorState, logger).ToArray();

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
    public override IEnumerable<object[]> GetData(MethodInfo methodInfo)
    {
        var files = Directory.GetFiles(Path.Join("Features", "Validators", "shared-expression-validation-tests"));

        foreach (var file in files)
        {
            var data = File.ReadAllText(file);
            ExpressionValidationTestModel testCase = JsonSerializer.Deserialize<ExpressionValidationTestModel>(
                data,
                new JsonSerializerOptions
                {
                    ReadCommentHandling = JsonCommentHandling.Skip,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                })!;
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
