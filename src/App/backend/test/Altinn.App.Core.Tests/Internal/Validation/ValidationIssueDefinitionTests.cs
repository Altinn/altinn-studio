using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Tests.Internal.Validation;

public class ValidationIssueDefinitionTests
{
    [Fact]
    public void Create_SetsEveryField()
    {
        var definition = new ValidationIssueDefinition
        {
            Code = "TestCode",
            Severity = ValidationIssueSeverity.Warning,
            Description = "A test issue.",
            TextResource = new()
            {
                Key = "backend.test",
                DefaultText = LocalizedText.Create(nb: "{name}", nn: "{name}", en: "{name}"),
                CustomTextParameters = [new("name", "A name")],
            },
        };

        var issue = definition.Create("element", "field", ["value"]);

        Assert.Equal("TestCode", issue.Code);
        Assert.Equal(ValidationIssueSeverity.Warning, issue.Severity);
        Assert.Equal("element", issue.DataElementId);
        Assert.Equal("field", issue.Field);
        Assert.Equal("backend.test", issue.CustomTextKey);
        Assert.Equal(new Dictionary<string, string> { ["name"] = "value" }, issue.CustomTextParameters);
    }
}
