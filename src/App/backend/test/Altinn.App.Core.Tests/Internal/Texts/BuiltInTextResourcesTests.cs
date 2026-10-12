using System.Text;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class BuiltInTextResourcesTests
{
    private static readonly string[] _languages = [LanguageConst.Nb, LanguageConst.Nn, LanguageConst.En];

    [Fact]
    public void All_HasTheValidationIssueTextsAndTheOthers()
    {
        Assert.Equal(
            BuiltInValidationIssues
                .All.Select(definition => definition.TextResource)
                .Concat(BuiltInTextResources.Other),
            BuiltInTextResources.All
        );
    }

    [Fact]
    public void KeysAreUnique()
    {
        var keys = BuiltInTextResources.All.Select(text => text.Key).ToList();

        Assert.Equal(keys.Count, keys.Distinct().Count());
        Assert.Equal(keys.Count, BuiltInTextResources.ByKey.Count);
    }

    [Fact]
    public void VariableNamesAreUnique()
    {
        Assert.All(
            BuiltInTextResources.All,
            text =>
            {
                var names = text.Variables.Select(variable => variable.Name).ToList();
                Assert.Equal(names.Count, names.Distinct().Count());
            }
        );
    }

    [Fact]
    public void EveryTextHasATemplateInNbNnAndEn()
    {
        // ToTemplate throws for a placeholder that is not a declared variable.
        Assert.All(
            BuiltInTextResources.All,
            text => Assert.All(_languages, language => Assert.NotNull(BuiltInTextResources.Find(text.Key, language)))
        );
    }

    [Fact]
    public void EveryLanguageUsesTheSameVariables()
    {
        Assert.All(
            BuiltInTextResources.All,
            text =>
                Assert.Single(
                    _languages
                        .Select(language => text.ToTemplate(language)!.Variables.Select(v => v.ToString()).Order())
                        .Select(variables => string.Join(",", variables))
                        .Distinct()
                )
        );
    }

    [Fact]
    public void NoTextUsesVariablesThatNeedLayoutState()
    {
        // Every caller of these texts translates with only a language, where data model, instance context and
        // application settings variables cannot be resolved.
        Assert.All(
            BuiltInTextResources.All,
            text =>
                Assert.DoesNotContain(
                    text.Variables,
                    variable =>
                        variable.Source
                            is TextVariableSource.DataModel
                                or TextVariableSource.InstanceContext
                                or TextVariableSource.ApplicationSetting
                )
        );
    }

    [Fact]
    public Task Documentation()
    {
        var markdown = new StringBuilder();
        markdown.Append("# Built-in texts\n\n");
        markdown.Append("An app changes one of these texts by adding a text resource with the same key.\n");

        foreach (var text in BuiltInTextResources.All)
        {
            markdown.Append($"\n## `{text.Key}`\n\n");
            markdown.Append("| Language | Default text |\n|---|---|\n");
            var rawTexts = text.Texts.RawTexts.ToList();
            if (rawTexts.Select(raw => raw.Text).Distinct().Count() == 1)
            {
                markdown.Append($"| all | {rawTexts[0].Text} |\n");
            }
            else
            {
                foreach (var (language, value) in rawTexts)
                {
                    markdown.Append($"| {language} | {value} |\n");
                }
            }

            if (text.Variables.Count > 0)
            {
                markdown.Append("\n| Variable | Source | Description |\n|---|---|---|\n");
                foreach (var variable in text.Variables)
                {
                    markdown.Append($"| `{variable.Name}` | {Source(variable)} | {variable.Description} |\n");
                }
            }
        }

        return Verify(markdown.ToString(), extension: "md");
    }

    private static string Source(BackendTextVariable variable)
    {
        var (dataSource, key) = variable.Source switch
        {
            TextVariableSource.CustomTextParameter => ("customTextParameters", null),
            TextVariableSource.Text text => ("text", text.TextKey),
            TextVariableSource.DataModel dataModel => ($"dataModel.{dataModel.DataType ?? "default"}", dataModel.Field),
            TextVariableSource.InstanceContext instanceContext => ("instanceContext", instanceContext.Key.ToString()),
            TextVariableSource.ApplicationSetting setting => ("applicationSettings", setting.Key),
            TextVariableSource.Unsupported unsupported => (unsupported.DataSource, unsupported.Key),
            _ => throw new ArgumentOutOfRangeException(nameof(variable), variable, "Unknown text variable source"),
        };

        return (key, variable.Source.DefaultValue) switch
        {
            (null, _) => $"`{dataSource}`",
            (_, { Length: > 0 } fallback) => $"`{dataSource}`: `{key}`, or \"{fallback}\" when it has no value",
            _ => $"`{dataSource}`: `{key}`",
        };
    }
}
