using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class JsonObjectInDataResponseMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private Task<MigrationResult> Migrate() =>
        JsonObjectInDataResponseMigration.Migrate(Path.Combine(_app.Root, "App"));

    [Fact]
    public async Task Removes_the_flag_and_keeps_the_other_flags()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "FeatureManagement": {
                "NewPdfGeneration": true,
                "JsonObjectInDataResponse": true, // Extended attachment validation
                "BetaPDFenabled": false
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var warning = Assert.Single(result.Warnings);
        Assert.DoesNotContain("instead of a text", warning);
        Assert.Equal(
            """
            {
              "FeatureManagement": {
                "NewPdfGeneration": true,
                "BetaPDFenabled": false
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Removes_the_last_flag_and_the_comma_before_it()
    {
        _app.Write(
            "appsettings.Development.json",
            "{\r\n  \"featureManagement\": {\r\n    \"A\": true,\r\n    \"jsonObjectInDataResponse\": \"true\"\r\n  }\r\n}\r\n"
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(
            "{\r\n  \"featureManagement\": {\r\n    \"A\": true\r\n  }\r\n}\r\n",
            _app.Read("appsettings.Development.json")
        );
    }

    [Fact]
    public async Task Points_out_that_a_disabled_flag_changes_the_response()
    {
        _app.Write(
            "appsettings.json",
            """
            {
              "FeatureManagement": {
                "JsonObjectInDataResponse": false
              }
            }
            """
        );

        var result = await Migrate();

        Assert.False(result.RequiresManualFollowUp);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("= false", warning);
        Assert.Contains("instead of a text", warning);
        Assert.Equal(
            """
            {
              "FeatureManagement": {
              }
            }
            """,
            _app.Read("appsettings.json")
        );
    }

    [Fact]
    public async Task Leaves_a_flag_sharing_its_line_with_a_to_do()
    {
        const string content = """{ "FeatureManagement": { "JsonObjectInDataResponse": true, "A": true } }""";
        _app.Write("appsettings.json", content);

        var result = await Migrate();

        Assert.True(result.RequiresManualFollowUp);
        Assert.Equal(content, _app.Read("appsettings.json"));
    }

    [Fact]
    public async Task Leaves_the_name_in_other_sections_alone()
    {
        const string content = """
            {
              "MySettings": {
                "JsonObjectInDataResponse": true
              },
              "FeatureManagement": { "A": true }
            }
            """;
        _app.Write("appsettings.json", content);

        Assert.Empty((await Migrate()).Messages);
        Assert.Equal(content, _app.Read("appsettings.json"));
    }
}
