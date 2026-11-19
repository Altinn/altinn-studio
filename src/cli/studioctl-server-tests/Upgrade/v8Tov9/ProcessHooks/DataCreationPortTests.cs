using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// <c>DataCreation</c> stays on the overload that gets the instance; what it does in the workflow engine's callback is
/// reported only when the app has an auto-created form.
/// </summary>
public sealed class DataCreationPortTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void AWriteInDataCreation_StaysAsItIs_AndIsATodoOnlyWithAnAutoCreatedForm(bool autoCreate)
    {
        var source = """
            public class InstantiationProcessor(IInstanceClient instanceClient) : IInstantiationProcessor
            {
                public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                {
                    await instanceClient.UpdateDataValue(instance, "status", "mottatt");
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, AutoCreatedForm(autoCreate));

        var result = Port(AppFolder);

        Assert.Equal(InApp(source), _app.Read(HookPath));
        Assert.Equal(
            autoCreate
                ?
                [
                    At(
                        source,
                        "await instanceClient.UpdateDataValue(instance, \"status\", \"mottatt\");",
                        UpgradeMessageStatus.Todo,
                        "IInstanceClient.UpdateDataValue writes to Storage in InstantiationProcessor.DataCreation, which v9 also runs in the process transition when a task with an autoCreate data type starts. Storage refuses direct writes to the instance there. Implement DataCreation(IInstanceDataMutator, object, Dictionary<string, string>?), the overload v9 calls there, and make the change through the mutator."
                    ),
                ]
                : [],
            result.Messages.Where(static message => message.Status == UpgradeMessageStatus.Todo)
        );
    }

    [Fact]
    public void AReadInDataCreation_IsNotReported()
    {
        var source = """
            public class InstantiationProcessor(IInstanceClient instanceClient) : IInstantiationProcessor
            {
                public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                {
                    var id = new InstanceIdentifier(instance);
                    var stored = await instanceClient.GetInstance("app", "org", id.InstanceOwnerPartyId, id.InstanceGuid);
                    Console.WriteLine(stored.Id);
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, AutoCreatedForm(autoCreate: true));

        var result = Port(AppFolder);

        Assert.Equal(InApp(source), _app.Read(HookPath));
        Assert.Empty(result.Todos);
    }

    private static string AutoCreatedForm(bool autoCreate) =>
        $$"""
            {
              "id": "nfk/app",
              "dataTypes": [
                {
                  "id": "skjema",
                  "appLogic": {
                    "classRef": "App.Logic.Model",
                    "autoCreate": {{(autoCreate ? "true" : "false")}}
                  }
                }
              ]
            }
            """;

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TheCallerRead_InADataCreation_IsATodoOnlyWithAnAutoCreatedForm(bool autoCreate)
    {
        // nfk ×15 InstantiationProcessor reading IAuthenticationContext.Current. Without an auto-created form,
        // DataCreation runs only on the user's own requests.
        var source = """
            public class InstantiationProcessor(Altinn.App.Core.Features.Auth.IAuthenticationContext authenticationContext, ILogger<InstantiationProcessor> logger) : IInstantiationProcessor
            {
                public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
                {
                    logger.LogInformation("{Caller}", authenticationContext.Current);
                    return Task.CompletedTask;
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, AutoCreatedForm(autoCreate));

        var result = Port(AppFolder);

        Assert.Equal(
            autoCreate
                ?
                [
                    At(
                        source,
                        "logger.LogInformation(\"{Caller}\", authenticationContext.Current);",
                        UpgradeMessageStatus.Todo,
                        "reads IAuthenticationContext.Current in InstantiationProcessor.DataCreation. In v9 the hook runs in the workflow engine's callback, where IAuthenticationContext.Current is the app itself and the HTTP request is the engine's, so the user who moved the process on is not available. This is a gap in the v9 app libraries, not in your code; keep this code until a release closes it."
                    ),
                ]
                : [],
            result.Messages.Where(static message =>
                message.Text.Contains("IAuthenticationContext.Current", StringComparison.Ordinal)
            )
        );
    }
}
