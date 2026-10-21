using System.Reflection;
using System.Text;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class BuiltInValidationIssuesTests
{
    private static readonly List<FieldInfo> _definitionFields = typeof(BuiltInValidationIssues)
        .GetFields(BindingFlags.Public | BindingFlags.Static)
        .Where(field => field.FieldType == typeof(ValidationIssueDefinition))
        .ToList();

    private static readonly List<MethodInfo> _factories = typeof(BuiltInValidationIssues)
        .GetMethods(BindingFlags.Public | BindingFlags.Static)
        .Where(method => method.ReturnType == typeof(ValidationIssue))
        .ToList();

    [Fact]
    public void All_ContainsEveryDefinition()
    {
        var declared = _definitionFields.Select(field => (ValidationIssueDefinition)field.GetValue(null)!);

        Assert.Equal(
            declared.Select(definition => definition.TextResource.Key).Order(),
            BuiltInValidationIssues.All.Select(definition => definition.TextResource.Key).Order()
        );
    }

    [Fact]
    public void KeysAndCodesAreUnique()
    {
        Assert.Equal(
            BuiltInValidationIssues.All.Count,
            BuiltInValidationIssues.All.Select(definition => definition.TextResource.Key).Distinct().Count()
        );
        Assert.Equal(
            BuiltInValidationIssues.All.Count,
            BuiltInValidationIssues.All.Select(definition => definition.Code).Distinct().Count()
        );
    }

    [Fact]
    public void EveryDefinitionHasAFactory()
    {
        Assert.Equal(
            _definitionFields.Select(field => field.Name).Order(),
            _factories.Select(method => method.Name + "Definition").Order()
        );
    }

    [Fact]
    public void FactoryParametersEndWithTheCustomTextParameters()
    {
        Assert.All(
            _factories,
            factory =>
            {
                var definition = (ValidationIssueDefinition)
                    typeof(BuiltInValidationIssues).GetField(factory.Name + "Definition")!.GetValue(null)!;
                var expected = definition.TextResource.CustomTextParameters.Select(p => p.Name).ToList();
                var actual = factory.GetParameters().Select(p => p.Name!).TakeLast(expected.Count).ToList();

                Assert.True(factory.GetParameters().Length >= expected.Count, factory.Name);
                Assert.Equal(expected, actual);
            }
        );
    }

    [Fact]
    public void Factory_CreatesTheIssue()
    {
        var issue = BuiltInValidationIssues.FileTooLarge(
            dataElementId: "element",
            filename: null,
            dataType: "attachment",
            maxSize: 1000
        );

        Assert.Equal(ValidationIssueCodes.DataElementCodes.DataElementTooLarge, issue.Code);
        Assert.Equal(ValidationIssueSeverity.Error, issue.Severity);
        Assert.Equal("element", issue.DataElementId);
        Assert.Equal("attachment", issue.Field);
        Assert.Equal("validation_errors.file_too_large", issue.CustomTextKey);
        Assert.Equal(
            new Dictionary<string, string>
            {
                ["filename"] = "",
                ["dataType"] = "attachment",
                ["maxSize"] = "1000",
            },
            issue.CustomTextParameters
        );
    }

    [Fact]
    public Task Documentation()
    {
        var markdown = new StringBuilder();
        markdown.Append("# Built-in validation issues\n\n");
        markdown.Append("| Code | Severity | Text key | Custom text parameters |\n");
        markdown.Append("|---|---|---|---|\n");
        foreach (var definition in BuiltInValidationIssues.All)
        {
            var parameters = definition.TextResource.CustomTextParameters.Select(p => $"`{p.Name}`").ToList();
            markdown.Append(
                $"| `{definition.Code}` | {definition.Severity} | `{definition.TextResource.Key}` | {(parameters.Count == 0 ? "none" : string.Join(", ", parameters))} |\n"
            );
        }

        foreach (var definition in BuiltInValidationIssues.All)
        {
            markdown.Append($"\n## `{definition.TextResource.Key}`\n\n");
            markdown.Append($"{definition.Description}\n\n");
            markdown.Append($"Code `{definition.Code}`, severity {definition.Severity}.\n\n");
            markdown.Append("| Language | Default text |\n|---|---|\n");
            foreach (var (language, text) in definition.TextResource.Texts.RawTexts)
            {
                markdown.Append($"| {language} | {text} |\n");
            }

            if (definition.TextResource.CustomTextParameters.Count > 0)
            {
                markdown.Append("\n| Custom text parameter | Description |\n|---|---|\n");
                foreach (var parameter in definition.TextResource.CustomTextParameters)
                {
                    markdown.Append($"| `{parameter.Name}` | {parameter.Description} |\n");
                }
            }
        }

        return Verify(markdown.ToString(), extension: "md");
    }
}
