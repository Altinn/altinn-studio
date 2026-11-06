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
        // krt/krt-1026a-1 App/logic/SfagAPI/SfagApiServiceTask.cs:51-62.
        var source = """
            public class Model { public string? Error { get; set; } }

            public class SfagApiServiceTask(IDataClient dataClient) : Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.IServiceTask
            {
                public string Type => "SfagApiServiceTask";

                public async Task<Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult> Execute(Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskContext context)
                {
                    Instance instance = context.InstanceDataMutator.Instance;
                    var dataElement = instance.Data.Find(x => x.DataType == "model")!;
                    var instanceIdentifier = new InstanceIdentifier(instance);
                    var guid = new Guid(dataElement.Id);
                    dataElement = await dataClient.UnlockDataElement(instanceIdentifier, guid);
                    dataElement = await dataClient.UpdateFormData(instance, new Model { Error = "e" }, dataElement);
                    dataElement = await dataClient.Update(instance, dataElement);
                    dataElement = await dataClient.LockDataElement(instanceIdentifier, guid);
                    return Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult.FailedContinueProcessNext();
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(
            MetadataPath,
            """{ "id": "org/app", "dataTypes": [ { "id": "model", "appLogic": { "classRef": "App.Logic.Model" } } ] }"""
        );

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                """
                public class Model { public string? Error { get; set; } }

                public class SfagApiServiceTask : Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.IServiceTask
                {
                    public string Type => "SfagApiServiceTask";

                    public async Task<Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult> Execute(Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskContext context)
                    {
                        Instance instance = context.InstanceDataMutator.Instance;
                        var dataElement = instance.Data.Find(x => x.DataType == "model")!;
                        var instanceIdentifier = new InstanceIdentifier(instance);
                        var guid = new Guid(dataElement.Id);
                        await context.InstanceDataMutator.ReplaceFormData(dataElement, new Model { Error = "e" });
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
                "dataElement = await dataClient.UpdateFormData(instance, new Model { Error = \"e\" }, dataElement);",
                UpgradeMessageStatus.Warning,
                "IDataClient.UpdateFormData is saved only if the service task succeeds: v9 keeps nothing from an attempt that returns a failure. If it must be stored, return ServiceTaskResult.Success with the action the failure leads to."
            ),
            result.Messages
        );
        AssertCompilesAgainstV9(AppFolder);
    }
}
