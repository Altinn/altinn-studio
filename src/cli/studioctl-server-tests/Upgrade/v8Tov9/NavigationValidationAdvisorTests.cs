using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class NavigationValidationAdvisorTests : IDisposable
{
    private const string CurrentAll = """{"page":"current","show":["All"]}""";
    private const string PreviousAll = """{"page":"currentAndPrevious","show":["All"]}""";
    private const string CurrentEmpty = """{"page":"current","show":[]}""";
    private const string CurrentRequired = """{"page":"current","show":["Required"]}""";
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private void Settings(string? validation = null, string folder = "Task_1", string[]? order = null)
    {
        var pages = new JsonObject { ["order"] = JsonSerializer.SerializeToNode(order ?? ["A", "B", "C"]) };
        if (validation is not null)
            pages["validationOnNavigation"] = JsonNode.Parse(validation);
        _app.Write($"ui/{folder}/Settings.json", new JsonObject { ["pages"] = pages }.ToJsonString());
    }

    private void Page(JsonObject component, string? validation = null, string page = "B", string folder = "Task_1")
    {
        var data = new JsonObject { ["layout"] = new JsonArray(component) };
        if (validation is not null)
            data["validationOnNavigation"] = JsonNode.Parse(validation);
        _app.Write($"ui/{folder}/layouts/{page}.json", new JsonObject { ["data"] = data }.ToJsonString());
    }

    private static JsonObject Navigation(
        string config,
        string property = "validateOnNext",
        string type = "NavigationButtons"
    ) =>
        new()
        {
            ["id"] = "navigation",
            ["type"] = type,
            [property] = JsonNode.Parse(config),
        };

    private Task<MigrationResult> Analyze() => new NavigationValidationAdvisor(_app.Root).Analyze();

    [Theory]
    [InlineData("page")]
    [InlineData("task")]
    [InlineData("app")]
    [InlineData("legacy-app")]
    public async Task ChangedValidation_ReportsTodoWithLocationAndEffect_AndKeepsAllFiles(string level)
    {
        Settings(level == "task" ? CurrentRequired : null);
        if (level == "app")
            _app.Write("ui/Settings.json", $$$"""{"validationOnNavigation":{{{CurrentRequired}}}}""");
        if (level == "legacy-app")
            _app.Write("ui/layout-sets.json", $$$"""{"uiSettings":{"validationOnNavigation":{{{CurrentRequired}}}}}""");
        Page(Navigation(CurrentAll), level == "page" ? CurrentRequired : null);
        var before = Directory
            .EnumerateFiles(_app.Root, "*", SearchOption.AllDirectories)
            .ToDictionary(path => path, File.ReadAllBytes);

        var result = await Analyze();

        var todo = Assert.Single(result.Todos);
        Assert.True(result.RequiresManualFollowUp);
        Assert.Empty(result.Warnings);
        Assert.All(result.Messages, message => Assert.Equal(UpgradeMessageStatus.Todo, message.Status));
        Assert.Contains("App/ui/Task_1/layouts/B.json", todo, StringComparison.Ordinal);
        Assert.Contains("component 'navigation'", todo, StringComparison.Ordinal);
        Assert.Contains("validateOnNext", todo, StringComparison.Ordinal);
        Assert.Contains(
            "also check validation errors other than missing required values",
            todo,
            StringComparison.Ordinal
        );
        var inheritedFile = level switch
        {
            "page" => "App/ui/Task_1/layouts/B.json",
            "task" => "App/ui/Task_1/Settings.json",
            "app" => "App/ui/Settings.json",
            _ => "App/ui/layout-sets.json",
        };
        Assert.Contains($"validation in {inheritedFile} in v9", todo, StringComparison.Ordinal);
        Assert.EndsWith("Settings unchanged.", todo, StringComparison.Ordinal);
        foreach (var (path, contents) in before)
            Assert.Equal(contents, await File.ReadAllBytesAsync(path, TestContext.Current.CancellationToken));
        Assert.Equal(before.Count, Directory.EnumerateFiles(_app.Root, "*", SearchOption.AllDirectories).Count());
    }

    [Theory]
    [InlineData(CurrentAll)]
    [InlineData("""{"show":["CustomBackend","All","All"]}""")]
    [InlineData(
        """{"page":"current","show":["Required","Invalid","Schema","Component","Expression","CustomBackend"]}"""
    )]
    public async Task EquivalentCategoriesAndDefaultPage_AreCompletelySilent(string config)
    {
        Settings(CurrentAll);
        Page(Navigation(config));

        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task CurrentAndPreviousOnFirstPage_PerformsTheSameChecksAndIsSilent()
    {
        Settings(CurrentAll);
        Page(Navigation(PreviousAll), page: "A");

        Assert.Empty((await Analyze()).Messages);
    }

    [Theory]
    [InlineData("all", "current")]
    [InlineData("currentAndPrevious", "current")]
    [InlineData("current", "currentAndPrevious")]
    public async Task EmptyValidationLists_StillCheckImmediatelyShownErrorsOnSelectedPages(
        string inheritedScope,
        string componentScope
    )
    {
        Settings($$$"""{"page":"{{{inheritedScope}}}","show":[]}""");
        Page(Navigation($$$"""{"page":"{{{componentScope}}}","show":[]}"""));

        var result = await Analyze();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Contains("Forward navigation will validate", Assert.Single(result.Todos), StringComparison.Ordinal);
        var component = JsonNode.Parse(_app.Read("ui/Task_1/layouts/B.json"))?["data"]?["layout"]?[0];
        Assert.Equal(componentScope, component?["validateOnNext"]?["page"]?.GetValue<string>());
        Assert.Empty(Assert.IsType<JsonArray>(component?["validateOnNext"]?["show"]));
    }

    [Theory]
    [InlineData("B", CurrentEmpty)]
    [InlineData("B", """{"show":[]}""")]
    [InlineData("A", """{"page":"currentAndPrevious","show":[]}""")]
    public async Task EmptyValidationLists_WithEquivalentPageScopes_AreSilent(string page, string config)
    {
        Settings(CurrentEmpty);
        Page(Navigation(config), page: page);

        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task MoreSpecificInheritedSettingsDetermineTheComparison()
    {
        _app.Write("ui/Settings.json", $$$"""{"validationOnNavigation":{{{CurrentRequired}}}}""");
        Settings(CurrentAll);
        Page(Navigation(CurrentAll));
        Assert.Empty((await Analyze()).Messages);

        Settings(CurrentRequired);
        Page(Navigation(CurrentAll), CurrentAll);
        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task OtherFoldersAndPages_DoNotCreateAnOverlap()
    {
        Settings(CurrentRequired, folder: "other");
        Settings();
        Page(Navigation(CurrentAll));
        Page(new JsonObject { ["id"] = "heading", ["type"] = "Heading" }, CurrentRequired, page: "C");

        Assert.Empty((await Analyze()).Messages);
    }

    [Theory]
    [InlineData("NavigationButtons", "validateOnNext")]
    [InlineData("navigationbar", "validateOnForward")]
    public async Task NarrowerPageScope_ExplainsThatEarlierPagesStopBeingChecked(string type, string property)
    {
        Settings(PreviousAll);
        Page(Navigation(CurrentAll, property, type));

        var todo = Assert.Single((await Analyze()).Todos);
        Assert.Contains("validate this page instead of this page and earlier pages", todo, StringComparison.Ordinal);
        Assert.Contains(property, todo, StringComparison.Ordinal);
        Assert.DoesNotContain("also check", todo, StringComparison.Ordinal);
    }

    [Fact]
    public async Task MixedChanges_ExplainBothTheNewRequiredChecksAndNarrowerPageScope()
    {
        Settings("""{"page":"currentAndPrevious","show":["AllExceptRequired"]}""");
        Page(Navigation(CurrentAll));

        var todo = Assert.Single((await Analyze()).Todos);
        Assert.Contains("validate this page instead of this page and earlier pages", todo, StringComparison.Ordinal);
        Assert.Contains("also check missing required values", todo, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("NavigationButtons", "validateOnPrevious")]
    [InlineData("NavigationBar", "validateOnBackward")]
    public async Task BackwardValidation_IsComparedWithPreviouslyDisabledValidation(string type, string property)
    {
        Settings(CurrentAll);
        Page(Navigation(CurrentAll, property, type));

        var todo = Assert.Single((await Analyze()).Todos);
        Assert.Contains("Backward navigation will now check", todo, StringComparison.Ordinal);
        Assert.Contains("previously", todo, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(
            "Previously, this component allowed backward navigation without validation.",
            todo,
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData("NavigationButtons", "validateOnPrevious", CurrentAll)]
    [InlineData("NavigationButtons", "validateOnPrevious", CurrentEmpty)]
    [InlineData("NavigationBar", "validateOnBackward", CurrentAll)]
    [InlineData("NavigationBar", "validateOnBackward", CurrentEmpty)]
    public async Task EmptyBackwardValidation_CanStartBlockingOnImmediatelyShownErrors(
        string type,
        string property,
        string inherited
    )
    {
        Settings(inherited);
        Page(Navigation(CurrentEmpty, property, type));
        var original = _app.Read("ui/Task_1/layouts/B.json");

        var result = await Analyze();

        Assert.True(result.RequiresManualFollowUp);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("component 'navigation', " + property, todo, StringComparison.Ordinal);
        Assert.Contains(
            "Backward navigation will now check validation errors shown immediately on this page",
            todo,
            StringComparison.Ordinal
        );
        Assert.Equal(original, _app.Read("ui/Task_1/layouts/B.json"));
    }

    [Theory]
    [InlineData("A", "validateOnPrevious")]
    [InlineData("C", "validateOnNext")]
    [InlineData("PDF", "validateOnNext")]
    public async Task DirectionsWithNoDestination_AreSilent(string page, string property)
    {
        Settings(CurrentRequired);
        Page(Navigation(CurrentAll, property), page: page);

        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task HiddenPageOrComponentOrBackButton_IsSilent()
    {
        Settings(CurrentRequired);
        var button = Navigation(CurrentAll);
        button["hidden"] = true;
        Page(button);
        Assert.Empty((await Analyze()).Messages);

        var back = Navigation(CurrentAll, "validateOnPrevious");
        back["showBackButton"] = false;
        Page(back);
        Assert.Empty((await Analyze()).Messages);

        _app.Write(
            "ui/Task_1/layouts/B.json",
            $$$"""{"data":{"hidden":true,"validationOnNavigation":{{{CurrentRequired}}},"layout":[{{{Navigation(CurrentAll).ToJsonString()}}}]}}"""
        );
        Assert.Empty((await Analyze()).Messages);
    }

    [Fact]
    public async Task NestedNavigationAndGroupedPageOrder_AreIncluded()
    {
        _app.Write(
            "ui/Task_1/Settings.json",
            $$$"""{"pages":{"groups":[{"order":["A","B","C"]}],"validationOnNavigation":{{{CurrentRequired}}}}}"""
        );
        Page(
            new JsonObject
            {
                ["id"] = "group",
                ["type"] = "Group",
                ["children"] = new JsonArray(Navigation(CurrentAll)),
            }
        );

        Assert.Single((await Analyze()).Todos);
    }

    [Theory]
    [InlineData("{not json")]
    [InlineData("[]")]
    public async Task UnreadableSettings_RequireReviewAndRemainUnchanged(string text)
    {
        _app.Write("ui/Task_1/Settings.json", text);
        Page(Navigation(CurrentAll));

        var todo = Assert.Single((await Analyze()).Todos);
        Assert.Contains("could not determine", todo, StringComparison.Ordinal);
        Assert.Contains("App/ui/Task_1/Settings.json", todo, StringComparison.Ordinal);
        Assert.Equal(text, _app.Read("ui/Task_1/Settings.json"));
    }

    [Theory]
    [InlineData("Unknown")]
    [InlineData("1")]
    public async Task UnknownValidationCategories_RequireReview(string category)
    {
        Settings(CurrentAll);
        Page(Navigation($$$"""{"page":"current","show":["{{{category}}}"]}"""));

        Assert.Contains("could not compare", Assert.Single((await Analyze()).Todos), StringComparison.Ordinal);
    }

    [Fact]
    public async Task CommentsTrailingCommasAndBom_AreAcceptedWithoutRewriting()
    {
        _app.Write(
            "ui/Task_1/Settings.json",
            "\uFEFF{ /* comment */ \"pages\": { \"order\": [\"A\",\"B\",\"C\",], \"validationOnNavigation\": "
                + CurrentRequired
                + ", }, }"
        );
        var original = "\uFEFF{\"data\":{\"layout\":[" + Navigation(CurrentAll).ToJsonString() + ",],},}";
        _app.Write("ui/Task_1/layouts/B.json", original);

        Assert.Single((await Analyze()).Todos);
        Assert.Equal(
            System.Text.Encoding.UTF8.GetBytes(original),
            await File.ReadAllBytesAsync(
                Path.Combine(_app.Root, "App/ui/Task_1/layouts/B.json"),
                TestContext.Current.CancellationToken
            )
        );
    }

    [Fact]
    public async Task UnreadableLayout_ProducesTodo()
    {
        _app.Write("ui/Task_1/layouts/B.json", "{not json");

        Assert.Contains(
            "could not check navigation validation",
            Assert.Single((await Analyze()).Todos),
            StringComparison.Ordinal
        );
    }

    [Theory]
    [InlineData("nextPage", "ClientAction", CurrentAll, CurrentRequired, "Forward navigation will also check")]
    [InlineData("navigateToPage", "ClientAction", CurrentAll, CurrentRequired, "This action will also check")]
    [InlineData("closeSubform", "ClientAction", CurrentAll, CurrentRequired, "This action will also check")]
    [InlineData("save", "ServerAction", CurrentRequired, CurrentAll, "This action will no longer check")]
    [InlineData("previousPage", "ServerAction", CurrentAll, CurrentRequired, "This action will also check")]
    [InlineData("previousPage", "ClientAction", CurrentAll, CurrentAll, "Backward navigation will now check")]
    [InlineData("previousPage", "ClientAction", CurrentEmpty, CurrentAll, "validation errors shown immediately")]
    [InlineData("nextPage", "ClientAction", CurrentAll, CurrentAll, null)]
    [InlineData("save", "ServerAction", CurrentAll, CurrentAll, null)]
    [InlineData("nextPage", "ClientAction", CurrentAll, null, null)]
    public async Task CustomButton_ReportsOnlyChangedLayoutActionValidation(
        string id,
        string type,
        string validation,
        string? inherited,
        string? expectedEffect
    )
    {
        Settings(inherited);
        Page(
            new JsonObject
            {
                ["id"] = "custom",
                ["type"] = "CustomButton",
                ["actions"] = new JsonArray(
                    new JsonObject { ["id"] = "save", ["type"] = "ServerAction" },
                    new JsonObject
                    {
                        ["id"] = id,
                        ["type"] = type,
                        ["validation"] = JsonNode.Parse(validation),
                        ["metadata"] = new JsonObject { ["page"] = "A" },
                    }
                ),
            }
        );
        var original = _app.Read("ui/Task_1/layouts/B.json");

        var result = await Analyze();

        if (expectedEffect is null)
            Assert.Empty(result.Messages);
        else
        {
            var todo = Assert.Single(result.Todos);
            Assert.Contains(
                "component 'custom', actions[1].validation (action '" + id + "')",
                todo,
                StringComparison.Ordinal
            );
            Assert.Contains(expectedEffect, todo, StringComparison.Ordinal);
            Assert.True(result.RequiresManualFollowUp);
        }
        Assert.Equal(original, _app.Read("ui/Task_1/layouts/B.json"));
    }

    [Fact]
    public async Task NoUi_IsSilent() => Assert.Empty((await Analyze()).Messages);

    [Fact]
    public async Task AppDirectoryInputAndLegacyRootLayouts_AreSupported()
    {
        _app.Write(
            "ui/Settings.json",
            $$$"""{"pages":{"order":["A","B","C"],"validationOnNavigation":{{{CurrentRequired}}}}}"""
        );
        _app.Write("ui/layouts/B.json", $$$"""{"data":{"layout":[{{{Navigation(CurrentAll).ToJsonString()}}}]}}""");

        var result = await new NavigationValidationAdvisor(Path.Combine(_app.Root, "App")).Analyze();

        Assert.Contains("ui/layouts/B.json", Assert.Single(result.Todos), StringComparison.Ordinal);
    }
}
