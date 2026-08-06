using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the misspelled config key renames: applicationmetadata, layout Settings.json and text
/// resources. All are matched in property-name position only, so values are never rewritten.
/// </summary>
public sealed class SpellingConfigMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> Migrate()
    {
        using var outputScope = UpgradeConsole.Use(TextWriter.Null, TextWriter.Null);
        return await SpellingConfigMigration.Migrate(_app.Root);
    }

    [Fact]
    public async Task RenamesAllowedContributersInApplicationMetadata()
    {
        var file = _app.Write(
            "config/applicationmetadata.json",
            """
            {
              "id": "ttd/test",
              "dataTypes": [
                { "id": "model", "allowedContributers": ["app:owned"] }
              ]
            }
            """
        );

        var result = await Migrate();

        var text = await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken);
        Assert.Contains("\"allowedContributors\": [\"app:owned\"]", text);
        Assert.DoesNotContain("allowedContributers", text);
        Assert.Empty(result.Warnings);
    }

    [Fact]
    public async Task RenamesAutoSaveBehaviourInLayoutSettings()
    {
        var file = _app.Write(
            "ui/form/Settings.json",
            """
            { "pages": { "order": ["p1"], "autoSaveBehaviour": "onChangeFormData" } }
            """
        );

        await Migrate();

        var text = await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken);
        Assert.Contains("\"autoSaveBehavior\": \"onChangeFormData\"", text);
        Assert.DoesNotContain("autoSaveBehaviour", text);
    }

    [Fact]
    public async Task RenamesOverriddenBuiltInTextKeys()
    {
        // Altinn text resources are a list of { "id": ..., "value": ... } objects, so the key sits
        // in value position under "id" rather than being a property name.
        var file = _app.Write(
            "config/texts/resource.nb.json",
            """
            {
              "language": "nb",
              "resources": [
                { "id": "date_picker.min_date_exeeded", "value": "For tidlig" },
                { "id": "date_picker.max_date_exeeded", "value": "For sent" },
                { "id": "my.own.key", "value": "Min tekst" }
              ]
            }
            """
        );

        await Migrate();

        var text = await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken);
        Assert.Contains("\"id\": \"date_picker.min_date_exceeded\"", text);
        Assert.Contains("\"id\": \"date_picker.max_date_exceeded\"", text);
        Assert.DoesNotContain("exeeded", text);
        // The app's own keys and all values are untouched.
        Assert.Contains("\"id\": \"my.own.key\"", text);
        Assert.Contains("\"value\": \"For tidlig\"", text);
    }

    [Fact]
    public async Task LeavesTextResourceValuesAlone()
    {
        // A value that happens to contain the old key name must not be rewritten.
        var file = _app.Write(
            "config/texts/resource.nb.json",
            """
            {
              "language": "nb",
              "resources": [
                { "id": "my.own.key", "value": "Se date_picker.min_date_exeeded" }
              ]
            }
            """
        );

        await Migrate();

        Assert.Contains(
            "\"value\": \"Se date_picker.min_date_exeeded\"",
            await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task LeavesValuesAlone()
    {
        // "allowedContributers" appearing as a value, not a key, must not be touched.
        var file = _app.Write(
            "config/applicationmetadata.json",
            """
            { "id": "ttd/test", "note": "allowedContributers" }
            """
        );

        await Migrate();

        Assert.Contains(
            "\"note\": \"allowedContributers\"",
            await File.ReadAllTextAsync(file, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public async Task WarnsInsteadOfCreatingADuplicateKey()
    {
        _app.Write(
            "config/applicationmetadata.json",
            """
            {
              "dataTypes": [
                { "allowedContributers": ["a"], "allowedContributors": ["b"] }
              ]
            }
            """
        );

        var result = await Migrate();

        var warning = Assert.Single(result.Warnings);
        Assert.Contains("allowedContributers", warning);
        Assert.Contains("duplicate key", warning);
    }

    [Fact]
    public async Task IsANoOpWhenNothingMatches()
    {
        _app.Write("config/applicationmetadata.json", """{ "id": "ttd/test" }""");

        var result = await Migrate();

        Assert.Empty(result.Warnings);
        Assert.False(result.ManualActionRequired);
    }
}
