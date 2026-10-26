using System.Text;
using Altinn.Studio.Cli.Upgrade.v8Tov9.KnownScenarios;

namespace Studioctl.Tests.Upgrade.v8Tov9.KnownScenarios;

/// <summary>Reading and editing applicationmetadata.json for the known scenarios.</summary>
public sealed class ApplicationMetadataTextTests : IDisposable
{
    private const string MetadataPath = "config/applicationmetadata.json";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private ApplicationMetadataText Read(string json)
    {
        _app.Write(MetadataPath, json);
        return Assert.IsType<ApplicationMetadataText>(ApplicationMetadataText.Read(AppFolder));
    }

    /// <summary>Files the scenarios do not edit; <c>null</c> for no file.</summary>
    public static TheoryData<string, byte[]?> Unreadable =>
        new()
        {
            { "there is no file", null },
            { "the file is not UTF-8", [0x7B, 0xFF, 0x7D] },
            { "the file is not JSON", Encoding.UTF8.GetBytes("{ \"dataTypes\": [ }") },
            {
                "a data type has a property twice",
                Encoding.UTF8.GetBytes(
                    "{ \"dataTypes\": [{ \"id\": \"A\", \"taskId\": \"Task_1\", \"taskId\": \"Task_2\" }] }"
                )
            },
            { "there are no dataTypes", Encoding.UTF8.GetBytes("{ \"id\": \"ttd/app\" }") },
            { "dataTypes is not an array", Encoding.UTF8.GetBytes("{ \"dataTypes\": {} }") },
            {
                "dataTypes is there in two spellings",
                Encoding.UTF8.GetBytes("{ \"dataTypes\": [], \"DataTypes\": [] }")
            },
        };

    [Theory]
    [MemberData(nameof(Unreadable))]
    public void Read_IsNull_WhenTheScenariosMustNotEditTheFile(string because, byte[]? content)
    {
        if (content is not null)
        {
            _app.WriteBytes(MetadataPath, content);
        }

        Assert.True(ApplicationMetadataText.Read(AppFolder) is null, because);
    }

    /// <summary>The <c>dataTypes</c> of a file, and the position of the one with id A in them.</summary>
    public static TheoryData<string, string, int?> DataTypes =>
        new()
        {
            { "one has the id", "[{ \"id\": \"B\" }, { \"id\": \"A\" }]", 1 },
            { "entries that are not objects count", "[\"A\", { \"id\": \"A\" }]", 1 },
            { "the name is spelled otherwise", "[{ \"Id\": \"A\" }]", 0 },
            { "none has the id", "[{ \"id\": \"B\" }, { \"id\": 1 }]", null },
            { "two have the id", "[{ \"id\": \"A\" }, { \"id\": \"A\" }]", null },
            { "one has two ids", "[{ \"id\": \"A\", \"Id\": \"A\" }]", null },
        };

    [Theory]
    [MemberData(nameof(DataTypes))]
    public void DataType_IsTheOneDataTypeWithTheId(string because, string dataTypes, int? index)
    {
        var metadata = Read($"{{ // the app's data types\n  \"DataTypes\": {dataTypes},\n}}");

        Assert.True(metadata.DataType("A")?.Index == index, because);
    }

    /// <summary>A file, the path of a property of data type 1, and the property's name and value as the file has them.</summary>
    public static TheoryData<string, string, string[], string, string> Properties =>
        new()
        {
            {
                "a property of the data type",
                "{ \"dataTypes\": [{ \"taskId\": \"first\" }, { \"id\": \"B\", \"taskId\": \"Task_1\" }] }",
                ["taskId"],
                "\"taskId\"",
                "\"Task_1\""
            },
            {
                "a property below the data type",
                "{ \"dataTypes\": [{}, { \"appLogic\": { \"classRef\": \"Form\", \"autoDeleteOnProcessEnd\": false } }] }",
                ["appLogic", "autoDeleteOnProcessEnd"],
                "\"autoDeleteOnProcessEnd\"",
                "false"
            },
            {
                "names as the file spells them",
                "{ \"DataTypes\": [{}, { \"TaskId\": \"Task_1\" }] }",
                ["TaskId"],
                "\"TaskId\"",
                "\"Task_1\""
            },
            {
                "an escaped name",
                "{ \"dataTypes\": [{}, { \"task\\u0049d\": [\"Task_1\"] }] }",
                ["taskId"],
                "\"task\\u0049d\"",
                "[\"Task_1\"]"
            },
            {
                "comments around the property",
                "{ /* a */ \"dataTypes\": [{}, // b\n { /* c */ \"taskId\": /* e */ \"Task_1\" /* f */ }] }",
                ["taskId"],
                "\"taskId\"",
                "\"Task_1\""
            },
            {
                "the same name elsewhere",
                "{ \"taskId\": \"root\", \"dataTypes\": [{ \"taskId\": \"first\", \"appLogic\": { \"taskId\": \"inner\" } }, "
                    + "{ \"appLogic\": { \"taskId\": \"inner\" }, \"taskId\": \"Task_1\" }], \"after\": { \"taskId\": \"x\" } }",
                ["taskId"],
                "\"taskId\"",
                "\"Task_1\""
            },
        };

    [Theory]
    [MemberData(nameof(Properties))]
    public void Locate_FindsTheNameAndValueOfTheProperty(
        string because,
        string json,
        string[] path,
        string name,
        string value
    )
    {
        var metadata = Read(json);
        var bytes = Encoding.UTF8.GetBytes(json);

        var (nameStart, nameEnd, valueStart, valueEnd) = metadata.Locate(1, path);

        Assert.True(Encoding.UTF8.GetString(bytes[nameStart..nameEnd]) == name, because);
        Assert.True(Encoding.UTF8.GetString(bytes[valueStart..valueEnd]) == value, because);
    }

    /// <summary>Files whose data type 0 has no <c>appLogic.taskId</c>, though other parts of the file have that path.</summary>
    [Theory]
    [InlineData("{ \"dataTypes\": [{ \"appLogic\": {} }], \"after\": [{ \"appLogic\": { \"taskId\": \"x\" } }] }")]
    [InlineData("{ \"dataTypes\": [{ \"appLogic\": {}, \"other\": { \"taskId\": \"x\" } }] }")]
    public void Locate_Throws_WhenTheDataTypeHasNoSuchProperty(string json)
    {
        var metadata = Read(json);

        Assert.Throws<InvalidOperationException>(() => metadata.Locate(0, "appLogic", "taskId"));
    }

    [Fact]
    public void Write_ReplacesTheSpans_AndKeepsTheByteOrderMarkLineEndingsAndComments()
    {
        const string Original =
            "{\r\n  // The app's data types\r\n  \"dataTypes\": [\r\n"
            + "    {\"id\": \"A\", \"taskId\": \"Task_1\" /* the form */, \"enablePdfCreation\": false},\r\n"
            + "  ],\r\n}\r\n";
        _app.WriteBytes(MetadataPath, [0xEF, 0xBB, 0xBF, .. Encoding.UTF8.GetBytes(Original)]);
        var metadata = Assert.IsType<ApplicationMetadataText>(ApplicationMetadataText.Read(AppFolder));
        var flag = Original.IndexOf("false", StringComparison.Ordinal);
        var task = Original.IndexOf("\"Task_1\"", StringComparison.Ordinal);

        metadata.Write([(flag, flag + 5, "true"), (task, task, "["), (task + 8, task + 8, ", \"Task_3\"]")]);

        Assert.Equal(
            [
                0xEF,
                0xBB,
                0xBF,
                .. Encoding.UTF8.GetBytes(
                    Original.Replace("\"Task_1\"", "[\"Task_1\", \"Task_3\"]").Replace("false", "true")
                ),
            ],
            _app.ReadBytes(MetadataPath)
        );
    }
}
