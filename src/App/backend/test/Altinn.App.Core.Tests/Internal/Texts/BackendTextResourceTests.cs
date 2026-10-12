using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class BackendTextResourceTests
{
    private readonly BackendTextResource _textResource = new()
    {
        Key = "backend.test",
        Texts = new LocalizedText(
            nb: "{count} av {name} på bokmål",
            nn: "{count} av {name} på nynorsk",
            en: "{count} of {name} in English"
        ),
        Variables =
        [
            BackendTextVariable.CustomTextParameter("name", "A name"),
            BackendTextVariable.CustomTextParameter("count", "A count"),
        ],
    };

    [Fact]
    public void CreateCustomTextParameters_PairsValuesByPosition()
    {
        var parameters = _textResource.CreateCustomTextParameters(["file", "2"]);

        Assert.Equal(new Dictionary<string, string> { ["name"] = "file", ["count"] = "2" }, parameters);
    }

    [Fact]
    public void CreateCustomTextParameters_LeavesOutNullValues()
    {
        var parameters = _textResource.CreateCustomTextParameters(["file", null]);

        Assert.Equal(new Dictionary<string, string> { ["name"] = "file" }, parameters);
    }

    [Fact]
    public void CreateCustomTextParameters_ThrowsOnWrongNumberOfValues()
    {
        Assert.Throws<ArgumentException>(() => _textResource.CreateCustomTextParameters(["file"]));
    }

    [Fact]
    public void CreateCustomTextParameters_ReturnsNullWithoutParameters()
    {
        var textResource = new BackendTextResource { Key = "backend.test", Texts = LocalizedText.Invariant("Text") };

        Assert.Null(textResource.CreateCustomTextParameters([]));
    }

    [Fact]
    public void CustomTextParameters_AreTheCustomTextParameterVariablesInOrder()
    {
        var textResource = new BackendTextResource
        {
            Key = "backend.test",
            Texts = LocalizedText.Invariant("{b} {appName} {a}"),
            Variables =
            [
                BackendTextVariable.CustomTextParameter("b", "B"),
                BackendTextVariable.Text("appName", "appName", "The app name"),
                BackendTextVariable.CustomTextParameter("a", "A"),
            ],
        };

        Assert.Equal(["b", "a"], textResource.CustomTextParameters.Select(variable => variable.Name));
    }

    [Theory]
    [InlineData("nb", "2 av file på bokmål")]
    [InlineData("nn", "2 av file på nynorsk")]
    [InlineData("en", "2 of file in English")]
    public void ToTemplate_UsesTheTextOfTheLanguage(string language, string expected)
    {
        var template = _textResource.ToTemplate(language);

        Assert.NotNull(template);
        Assert.Equal(
            [_textResource.Variables[1].Source, _textResource.Variables[0].Source],
            template.Variables.ToArray()
        );
        Assert.Equal(expected, template.Apply(["2", "file"]));
    }

    [Theory]
    [InlineData("se")]
    [InlineData("")]
    public void ToTemplate_IsNullForAnotherLanguage(string language)
    {
        Assert.Null(_textResource.ToTemplate(language));
    }

    [Fact]
    public void ToTemplate_IsBuiltOnce()
    {
        Assert.Same(_textResource.ToTemplate("nb"), _textResource.ToTemplate("nb"));
    }

    [Fact]
    public void ToTemplate_ThrowsForAPlaceholderWithoutAVariable()
    {
        var textResource = new BackendTextResource
        {
            Key = "backend.test",
            Texts = LocalizedText.Invariant("{missing}"),
        };

        Assert.Throws<InvalidOperationException>(() => textResource.ToTemplate("en"));
    }

    [Fact]
    public void Variables_HaveTheSourceOfTheirHelper()
    {
        BackendTextVariable[] variables =
        [
            BackendTextVariable.CustomTextParameter("a", "A parameter"),
            BackendTextVariable.Text("b", "appName", "The app name", fallback: "Altinn"),
            BackendTextVariable.DataModel("c", "model", "person.name", "A field"),
            BackendTextVariable.InstanceContext("d", InstanceContextKey.InstanceOwnerPartyId, "The party"),
            BackendTextVariable.ApplicationSetting("e", "homeLink", "A setting"),
        ];

        Assert.Equal(
            [
                new TextVariableSource.CustomTextParameter("a") { DefaultValue = "" },
                new TextVariableSource.Text("appName") { DefaultValue = "Altinn" },
                new TextVariableSource.DataModel("model", "person.name"),
                new TextVariableSource.InstanceContext(InstanceContextKey.InstanceOwnerPartyId),
                new TextVariableSource.ApplicationSetting("homeLink"),
            ],
            variables.Select(variable => variable.Source)
        );
    }
}
