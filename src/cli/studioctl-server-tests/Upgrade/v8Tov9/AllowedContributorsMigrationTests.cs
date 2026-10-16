using System.Text.Json;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class AllowedContributorsMigrationTests : IDisposable
{
    private const string MetadataPath = "config/applicationmetadata.json";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task RenamesThePropertyOnEveryDataType()
    {
        _app.Write(
            MetadataPath,
            """
            {
              "id": "ttd/app",
              "title": { "nb": "Mentions \"allowedContributers\": in a value" },
              "dataTypes": [
                { "id": "signatures", "allowedContributers": ["app:owned"] },
                {
                  "id": "receipt",
                  "allowedContributers"  : [ "org:ttd" ]
                },
                { "id": "model" }
              ]
            }
            """
        );

        var result = await AllowedContributorsMigration.Migrate(_app.Root);

        var after = _app.Read(MetadataPath);
        Assert.Contains("{ \"id\": \"signatures\", \"allowedContributors\": [\"app:owned\"] }", after);
        Assert.Contains("\"allowedContributors\"  : [ \"org:ttd\" ]", after);
        Assert.Contains("Mentions \\\"allowedContributers\\\": in a value", after);
        using var _ = JsonDocument.Parse(after);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("'signatures', 'receipt'", warning);
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public async Task PreservesByteOrderMark()
    {
        _app.WriteBytes(
            MetadataPath,
            [
                0xEF,
                0xBB,
                0xBF,
                .. """{ "dataTypes": [{ "id": "a", "allowedContributers": ["app:owned"] }] }"""u8.ToArray(),
            ]
        );

        await AllowedContributorsMigration.Migrate(_app.Root);

        var after = _app.ReadBytes(MetadataPath);
        Assert.Equal([0xEF, 0xBB, 0xBF], after[..3]);
        Assert.Equal(
            """{ "dataTypes": [{ "id": "a", "allowedContributors": ["app:owned"] }] }""",
            System.Text.Encoding.UTF8.GetString(after[3..])
        );
    }

    [Fact]
    public async Task LeavesFileUnchangedWhenADataTypeHasBothSpellings()
    {
        var content = """
            {
              "dataTypes": [
                { "id": "a", "allowedContributers": ["org:ttd"], "allowedContributors": ["app:owned"] },
                { "id": "b", "allowedContributers": ["app:owned"] }
              ]
            }
            """;
        _app.Write(MetadataPath, content);

        var result = await AllowedContributorsMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read(MetadataPath));
        var todo = Assert.Single(result.Todos);
        Assert.Contains("'a'", todo);
        Assert.DoesNotContain("'b'", todo);
    }

    [Fact]
    public async Task RenamesOnlyThePropertyOnTheDataTypes()
    {
        // The data type's name is written with a JSON escape for the C, so a literal match on the text would find
        // only the properties outside the data types.
        const string escapedName = "allowed\\u0043ontributers";
        _app.Write(
            MetadataPath,
            $$"""
            {
              "dataTypes": [{ "id": "a", "{{escapedName}}": ["app:owned"] }],
              "custom": { "allowedContributers": [], "nested": [{ "allowedContributers": [] }] }
            }
            """
        );

        var result = await AllowedContributorsMigration.Migrate(_app.Root);

        Assert.Equal(
            """
            {
              "dataTypes": [{ "id": "a", "allowedContributors": ["app:owned"] }],
              "custom": { "allowedContributers": [], "nested": [{ "allowedContributers": [] }] }
            }
            """,
            _app.Read(MetadataPath)
        );
        Assert.Contains("'a'", Assert.Single(result.Warnings));
    }

    [Fact]
    public async Task ReportsNothingWhenThereIsNothingToRename()
    {
        var content = """{ "dataTypes": [{ "id": "a", "allowedContributors": ["app:owned"] }] }""";
        _app.Write(MetadataPath, content);

        var result = await AllowedContributorsMigration.Migrate(_app.Root);

        Assert.Equal(content, _app.Read(MetadataPath));
        Assert.Empty(result.Messages);
    }
}
