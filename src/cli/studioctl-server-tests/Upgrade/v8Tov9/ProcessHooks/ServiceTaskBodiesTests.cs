using Altinn.Studio.Cli.Upgrade;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// A v8 service task already gets the mutator on its context; its Storage calls move to it, and a write before a
/// failure, which v9 does not keep, is warned about.
/// </summary>
public sealed class ServiceTaskBodiesTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    [Fact]
    public void AServiceTask_WritesThroughItsContextsMutator_AndAWriteBeforeAFailureIsWarnedAbout()
    {
        // krt/krt-1026a-1 App/logic/SfagAPI/SfagApiServiceTask.cs:51-62, with a binary write.
        var source = """
            public class SfagApiServiceTask(IDataClient dataClient) : Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.IServiceTask
            {
                public string Type => "SfagApiServiceTask";

                public async Task<Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult> Execute(Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskContext context)
                {
                    Instance instance = context.InstanceDataMutator.Instance;
                    var dataElement = instance.Data.Find(x => x.DataType == "model")!;
                    var instanceIdentifier = new InstanceIdentifier(instance);
                    var guid = new Guid(dataElement.Id);
                    var bytes = Encoding.UTF8.GetBytes("e");
                    await dataClient.UpdateBinaryData(instanceIdentifier, "text/plain", null, guid, new MemoryStream(bytes));
                    return Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult.FailedContinueProcessNext();
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, """{ "id": "org/app", "dataTypes": [ { "id": "model" } ] }""");

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                """
                public class SfagApiServiceTask : Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.IServiceTask
                {
                    public string Type => "SfagApiServiceTask";

                    public async Task<Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult> Execute(Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskContext context)
                    {
                        Instance instance = context.InstanceDataMutator.Instance;
                        var dataElement = instance.Data.Find(x => x.DataType == "model")!;
                        var instanceIdentifier = new InstanceIdentifier(instance);
                        var guid = new Guid(dataElement.Id);
                        var bytes = Encoding.UTF8.GetBytes("e");
                        context.InstanceDataMutator.UpdateBinaryDataElement(new global::Altinn.App.Core.Models.DataElementIdentifier(guid), "text/plain", bytes);
                        return Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult.FailedContinueProcessNext();
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        Assert.Contains(
            At(
                source,
                "await dataClient.UpdateBinaryData(instanceIdentifier, \"text/plain\", null, guid, new MemoryStream(bytes));",
                UpgradeMessageStatus.Warning,
                "IDataClient.UpdateBinaryData is saved only if the service task succeeds: v9 keeps nothing from an attempt that returns a failure. If it must be stored, return ServiceTaskResult.Success with the action the failure leads to."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }
}
