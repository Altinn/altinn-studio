using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Schema;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowContractTests
{
    private const string UpdateVariable = "UPDATE_WORKFLOW_CONTRACT";

    private static readonly JsonSerializerOptions _indented = new() { WriteIndented = true };

    /// <summary>
    /// Fails when the commands this library can plan, their payloads or the callback state change shape. An older pod
    /// reads none of the code that changed, so the snapshot is where the change gets a decision.
    /// </summary>
    [Fact]
    public void Shape_MatchesTheSnapshotOfThisVersion()
    {
        string path = SnapshotPath(WorkflowContract.Version);
        string actual = Describe();

        if (Environment.GetEnvironmentVariable(UpdateVariable) == "1")
        {
            File.WriteAllText(path, actual);
        }

        Assert.True(
            File.Exists(path),
            $"Workflow contract version {WorkflowContract.Version} has no snapshot at '{path}'. Write it by running this test with {UpdateVariable}=1, and keep the snapshots of earlier versions."
        );

        string[] expectedLines = Lines(File.ReadAllText(path));
        string[] actualLines = Lines(actual);
        int difference = Enumerable
            .Range(0, Math.Max(expectedLines.Length, actualLines.Length))
            .FirstOrDefault(i => expectedLines.ElementAtOrDefault(i) != actualLines.ElementAtOrDefault(i), -1);

        Assert.True(
            difference < 0,
            $"""
            What this library plans or writes to callback state no longer matches the snapshot of workflow contract version {WorkflowContract.Version}.
            First difference, at line {difference + 1}:
              snapshot: {expectedLines.ElementAtOrDefault(difference)}
              now:      {actualLines.ElementAtOrDefault(difference)}

            If a pod on the previous library version cannot run this or would drop part of it, raise WorkflowContract.Version and run this test with {UpdateVariable}=1 to write the new version's snapshot.
            If such a pod still reads it, run the test with {UpdateVariable}=1 without raising the version, and say in the pull request why it is safe.
            """
        );
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("""{"payload":"p","signature":"s","secretId":"1"}""")]
    [InlineData("""{"contractVersion":null,"payload":"p"}""")]
    [InlineData("""{"contractVersion":0,"payload":"p"}""")]
    public void IsWrittenUnderNewerVersion_NoVersionOrAnOlderOne_IsNotNewer(string? envelope)
    {
        Assert.False(WorkflowContract.IsWrittenUnderNewerVersion(envelope, out string? version, out string? writtenBy));
        Assert.Null(version);
        Assert.Null(writtenBy);
    }

    [Fact]
    public void IsWrittenUnderNewerVersion_ThisVersion_IsNotNewer()
    {
        string envelope = $$"""{"contractVersion":{{WorkflowContract.Version}},"writtenBy":"9.0.0","payload":"p"}""";

        Assert.False(WorkflowContract.IsWrittenUnderNewerVersion(envelope, out _, out _));
    }

    [Fact]
    public void IsWrittenUnderNewerVersion_HigherVersion_IsNewerAndNamesTheWriter()
    {
        int newer = WorkflowContract.Version + 1;
        string envelope = $$"""{"payload":"p","writtenBy":"9.4.0","contractVersion":{{newer}}}""";

        Assert.True(WorkflowContract.IsWrittenUnderNewerVersion(envelope, out string? version, out string? writtenBy));
        Assert.Equal(newer.ToString(System.Globalization.CultureInfo.InvariantCulture), version);
        Assert.Equal("9.4.0", writtenBy);
    }

    /// <summary>
    /// This library always writes a whole number, so anything else comes from a version it does not know.
    /// </summary>
    [Theory]
    [InlineData("\"1\"")]
    [InlineData("1.5")]
    [InlineData("99999999999999999999")]
    [InlineData("true")]
    [InlineData("{\"major\":1}")]
    public void IsWrittenUnderNewerVersion_VersionThatIsNotAWholeNumber_IsNewer(string contractVersion)
    {
        string envelope = $$"""{"contractVersion":{{contractVersion}},"payload":"p"}""";

        Assert.True(WorkflowContract.IsWrittenUnderNewerVersion(envelope, out string? version, out string? writtenBy));
        Assert.Equal(contractVersion, version);
        Assert.Null(writtenBy);
    }

    [Fact]
    public void LibraryVersion_IsThePackageVersionWithoutBuildMetadata()
    {
        string informational = typeof(WorkflowContract)
            .Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()!
            .InformationalVersion;

        Assert.Equal(informational.Split('+')[0], WorkflowContract.LibraryVersion);
    }

    private static string Describe()
    {
        var description = new JsonObject
        {
            ["contractVersion"] = WorkflowContract.Version,
            ["commandKeys"] = new JsonArray([.. CommandKeys().Select(key => (JsonNode)key)]),
            ["commandPayload"] = Schema(typeof(CommandRequestPayload), CommandPayloadJsonContext.Default.Options),
            ["signedEnvelope"] = Schema(typeof(SignedWorkflowState), JsonSerializerOptions.Default),
            ["callbackState"] = Schema(typeof(WorkflowCallbackState), JsonSerializerOptions.Default),
        };
        return description.ToJsonString(_indented) + "\n";
    }

    private static IEnumerable<string> CommandKeys()
    {
        IEnumerable<Type> commands = typeof(WorkflowContract)
            .Assembly.GetTypes()
            .Where(type =>
                type is { IsClass: true, IsAbstract: false }
                && (typeof(IWorkflowEngineCommand).IsAssignableFrom(type) || type == typeof(ProcessingStatusAcquirer))
            );

        const BindingFlags anyStatic = BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static;
        return commands
            .Select(type =>
                (type.GetProperty("Key", anyStatic)?.GetValue(null) ?? type.GetField("Key", anyStatic)?.GetValue(null))
                    as string
                ?? throw new InvalidOperationException(
                    $"{type.Name} has no static string Key, so the snapshot cannot list its command key."
                )
            )
            .Order(StringComparer.Ordinal);
    }

    /// <summary>
    /// The JSON shape of a type as the serializer writes it. A type from another assembly, such as Storage's
    /// <c>Instance</c>, is named and not described: its shape follows a package version this library does not own.
    /// </summary>
    private static JsonNode Schema(Type type, JsonSerializerOptions options)
    {
        Assembly core = typeof(WorkflowContract).Assembly;
        var exporterOptions = new JsonSchemaExporterOptions
        {
            TransformSchemaNode = (context, node) =>
            {
                Type described = Nullable.GetUnderlyingType(context.TypeInfo.Type) ?? context.TypeInfo.Type;
                bool foreign =
                    described.Assembly != core
                    && described.Namespace?.StartsWith("System", StringComparison.Ordinal) != true;
                return foreign ? new JsonObject { ["typeFromAnotherAssembly"] = described.FullName } : node;
            },
        };
        return options.GetJsonSchemaAsNode(type, exporterOptions);
    }

    private static string[] Lines(string text) => text.ReplaceLineEndings("\n").TrimEnd('\n').Split('\n');

    private static string SnapshotPath(int version, [CallerFilePath] string testFile = "") =>
        Path.Combine(Path.GetDirectoryName(testFile)!, $"WorkflowContract.v{version}.json");
}
