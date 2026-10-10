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
        Variables = [new CustomTextParameter("name", "A name"), new CustomTextParameter("count", "A count")],
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
    public void ReplacementVariables_FollowTheOrderOfTheReplacementKeys()
    {
        // The texts use {count} first, so it is the first replacement key, while the variables list name first.
        Assert.Equal(["count", "name"], _textResource.Texts.ReplacementKeys);
        Assert.Equal(["count", "name"], _textResource.ReplacementVariables.Select(variable => variable.Name));
    }

    [Fact]
    public void ReplacementVariables_ThrowsForAPlaceholderWithoutAVariable()
    {
        var textResource = new BackendTextResource
        {
            Key = "backend.test",
            Texts = LocalizedText.Invariant("{missing}"),
        };

        Assert.Throws<InvalidOperationException>(() => textResource.ReplacementVariables);
    }

    [Fact]
    public void Variables_DescribeTheirDataSource()
    {
        BackendTextVariable[] variables =
        [
            new CustomTextParameter("a", "A parameter"),
            new TextVariable("b", "appName", "The app name", Fallback: "Altinn"),
            new DataModelVariable("c", "model", "person.name", "A field"),
            new InstanceContextVariable("d", "instanceOwnerPartyId", "The party"),
            new ApplicationSettingVariable("e", "homeLink", "A setting"),
        ];

        Assert.Equal(
            [
                ("customTextParameters", "a", "", false),
                ("text", "appName", "Altinn", false),
                ("dataModel.model", "person.name", null, true),
                ("instanceContext", "instanceOwnerPartyId", null, true),
                ("applicationSettings", "homeLink", null, true),
            ],
            variables.Select(variable =>
                (variable.DataSource, variable.Key, variable.DefaultValue, variable.NeedsLayoutState)
            )
        );
    }
}
