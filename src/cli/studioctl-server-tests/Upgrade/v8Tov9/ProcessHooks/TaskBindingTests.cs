using Altinn.Studio.Cli.Upgrade;
using Microsoft.CodeAnalysis;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.StorageCallStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// v9 refuses a data element write while no task its data type is bound to is current, in process transitions too:
/// such a write stays as it is, with the locks around it, and gets a to-do; one v9 accepts is rewritten.
/// </summary>
public sealed class TaskBindingTests : IDisposable
{
    private const string ProcessPath = "config/process/process.bpmn";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    // pat/patent App/logic/TaskProcessor/ProcessTaskEnd.cs:43-135: the case number goes into the form of
    // Task_FillOutForm at the end of the payment or signing task.
    private const string CaseNumberHook = """
        public class AllocatedCaseNumber { public string? CaseNumber { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                var paymentMethod = instance.DataValues?["paymentMethod"];
                if (paymentMethod == "invoice" && taskId == "Task_Signature" || paymentMethod != "invoice" && taskId == "Task_Payment")
                {
                    var (model, instanceIdentifier, modelData) = await GetAllocatedCaseNumberModel(instance);
                    model.CaseNumber = "2026/1";
                    await UpdateData(instance, instanceIdentifier, modelData, model);
                }
            }

            private async Task<(AllocatedCaseNumber, InstanceIdentifier, DataElement)> GetAllocatedCaseNumberModel(Instance instance)
            {
                DataElement modelData = instance.Data.Single(x => x.DataType == "AllocatedCaseNumber");
                InstanceIdentifier instanceIdentifier = new(instance);
                var model = (AllocatedCaseNumber)await dataClient.GetFormData(instance, modelData);
                return (model, instanceIdentifier, modelData);
            }

            private async Task UpdateData(Instance instance, InstanceIdentifier instanceIdentifier, DataElement modelData, AllocatedCaseNumber model)
            {
                var modelDataId = Guid.Parse(modelData.Id);
                await dataClient.UnlockDataElement(instanceIdentifier, modelDataId);
                await dataClient.UpdateData(model, instanceIdentifier.InstanceGuid, typeof(AllocatedCaseNumber), instance.Org, instance.AppId, instanceIdentifier.InstanceOwnerPartyId, modelDataId);
                await dataClient.LockDataElement(instanceIdentifier, modelDataId);
            }
        }
        """;

    private const string CaseNumberHookRewritten = $$"""
        public class AllocatedCaseNumber { public string? CaseNumber { get; set; } }

        public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_Signature" || taskId == "Task_Payment";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                var paymentMethod = instance.DataValues?["paymentMethod"];
                if (paymentMethod == "invoice" && taskId == "Task_Signature" || paymentMethod != "invoice" && taskId == "Task_Payment")
                {
                    var (model, instanceIdentifier, modelData) = await GetAllocatedCaseNumberModel(dataMutator);
                    model.CaseNumber = "2026/1";
                    await UpdateData(dataMutator, instanceIdentifier, modelData, model);
                }
                return {{HandlerResult}}.Success();
            }

            private async Task<(AllocatedCaseNumber, InstanceIdentifier, DataElement)> GetAllocatedCaseNumberModel({{IInstanceDataMutator}} dataMutator)
            {
                Instance instance = dataMutator.Instance;
                DataElement modelData = instance.Data.Single(x => x.DataType == "AllocatedCaseNumber");
                InstanceIdentifier instanceIdentifier = new(instance);
                var model = (AllocatedCaseNumber)await dataMutator.GetFormDataCopy(modelData);
                return (model, instanceIdentifier, modelData);
            }

            private async Task UpdateData({{IInstanceDataMutator}} dataMutator, InstanceIdentifier instanceIdentifier, DataElement modelData, AllocatedCaseNumber model)
            {
                var modelDataId = Guid.Parse(modelData.Id);
                await dataMutator.ReplaceFormData(new {{DataElementIdentifier}}(modelDataId), model);
            }
        }
        """;

    private const string CaseNumberHookKept = $$"""
        public class AllocatedCaseNumber { public string? CaseNumber { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_Signature" || taskId == "Task_Payment";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                var paymentMethod = instance.DataValues?["paymentMethod"];
                if (paymentMethod == "invoice" && taskId == "Task_Signature" || paymentMethod != "invoice" && taskId == "Task_Payment")
                {
                    var (model, instanceIdentifier, modelData) = await GetAllocatedCaseNumberModel(dataMutator);
                    model.CaseNumber = "2026/1";
                    await UpdateData(instance, instanceIdentifier, modelData, model);
                }
                return {{HandlerResult}}.Success();
            }

            private async Task<(AllocatedCaseNumber, InstanceIdentifier, DataElement)> GetAllocatedCaseNumberModel({{IInstanceDataMutator}} dataMutator)
            {
                Instance instance = dataMutator.Instance;
                DataElement modelData = instance.Data.Single(x => x.DataType == "AllocatedCaseNumber");
                InstanceIdentifier instanceIdentifier = new(instance);
                var model = (AllocatedCaseNumber)await dataMutator.GetFormDataCopy(modelData);
                return (model, instanceIdentifier, modelData);
            }

            private async Task UpdateData(Instance instance, InstanceIdentifier instanceIdentifier, DataElement modelData, AllocatedCaseNumber model)
            {
                var modelDataId = Guid.Parse(modelData.Id);
                await dataClient.UnlockDataElement(instanceIdentifier, modelDataId);
                await dataClient.UpdateData(model, instanceIdentifier.InstanceGuid, typeof(AllocatedCaseNumber), instance.Org, instance.AppId, instanceIdentifier.InstanceOwnerPartyId, modelDataId);
                await dataClient.LockDataElement(instanceIdentifier, modelDataId);
            }
        }
        """;

    private static readonly string[] _patentTasks = ["Task_FillOutForm", "Task_Payment", "Task_Signature"];

    // slv/apotekdrift App/logic/TaskProcessors/ProcessTaskEnd.cs:128-155: the form of Task_1 is scrubbed at the end of
    // the signing task Task_2.
    private const string ScrubHook = """
        public class model { public string? Hjelpefelt { get; set; } }

        public class ProcessTaskEnd(IDataClient data) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_2")
                {
                    await ProcessTask2(instance);
                }
            }

            private async Task ProcessTask2(Instance instance)
            {
                int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                DataElement modelDataElement = instance.Data.FirstOrDefault(d => d.DataType == "model");
                var model = (model)await data.GetFormData(instance, modelDataElement);
                model.Hjelpefelt = null;

                await data.UnlockDataElement(new InstanceIdentifier(instance), new Guid(modelDataElement.Id));
                await data.UpdateData(model, new Guid(modelDataElement.InstanceGuid), typeof(model), instance.Org, instance.AppId, instanceOwnerPartyId, Guid.Parse(modelDataElement.Id));
                await data.LockDataElement(new InstanceIdentifier(instance), new Guid(modelDataElement.Id));
            }
        }
        """;

    private const string ScrubHookKept = $$"""
        public class model { public string? Hjelpefelt { get; set; } }

        public class ProcessTaskEnd(IDataClient data) : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                if (taskId == "Task_2")
                {
                    await ProcessTask2(dataMutator);
                }
                return {{HandlerResult}}.Success();
            }

            private async Task ProcessTask2({{IInstanceDataMutator}} dataMutator)
            {
                Instance instance = dataMutator.Instance;
                int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                DataElement modelDataElement = instance.Data.FirstOrDefault(d => d.DataType == "model");
                var model = (model)await dataMutator.GetFormDataCopy(modelDataElement);
                model.Hjelpefelt = null;

                await data.UnlockDataElement(new InstanceIdentifier(instance), new Guid(modelDataElement.Id));
                await data.UpdateData(model, new Guid(modelDataElement.InstanceGuid), typeof(model), instance.Org, instance.AppId, instanceOwnerPartyId, Guid.Parse(modelDataElement.Id));
                await data.LockDataElement(new InstanceIdentifier(instance), new Guid(modelDataElement.Id));
            }
        }
        """;

    // brg/virksomhetsregistrering App/Features/DataBackup/DataBackupService.cs:50-58: leaving signee_selection
    // restores the main form of utfylling from its backup.
    private const string RestoreHook = """
        public class InnrapporteringFRIV { }

        public class DataBackupService(IDataClient dataClient) : IProcessTaskAbandon
        {
            public async Task Abandon(string taskId, Instance instance)
            {
                if (taskId != "signee_selection")
                {
                    return;
                }

                var backupData = new InnrapporteringFRIV();
                var hovedskjemaDataElement = instance.Data.First(d => d.DataType == "innrapporteringFRIV");
                await dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(hovedskjemaDataElement.Id));
                await dataClient.UpdateFormData(instance, backupData, hovedskjemaDataElement);
            }
        }
        """;

    private const string RestoreHookKept = $$"""
        public class InnrapporteringFRIV { }

        public class DataBackupService(IDataClient dataClient) : {{ProcessHookStubs.IOnTaskAbandoningHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "signee_selection";

            public async Task<{{HandlerResult}}> Execute({{ProcessHookStubs.OnTaskAbandoningContext}} context)
            {
                string taskId = context.TaskId;
                Instance instance = context.InstanceDataMutator.Instance;
                if (taskId != "signee_selection")
                {
                    return {{HandlerResult}}.Success();
                }

                var backupData = new InnrapporteringFRIV();
                var hovedskjemaDataElement = instance.Data.First(d => d.DataType == "innrapporteringFRIV");
                await dataClient.UnlockDataElement(new InstanceIdentifier(instance), Guid.Parse(hovedskjemaDataElement.Id));
                await dataClient.UpdateFormData(instance, backupData, hovedskjemaDataElement);
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // krt/krt-1026a-1 App/logic/SfagAPI/SfagApiServiceTask.cs:46-62: the service task Task_SfagApi writes the error
    // into the form of Task_1 before it fails.
    private const string SfagServiceTask = """
        public class Model { public string? sf_API_Error { get; set; } }

        public class SfagApiServiceTask(IDataClient dataClient) : Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.IServiceTask
        {
            public string Type => "SfagApiServiceTask";

            public async Task<Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult> Execute(Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskContext context)
            {
                Instance instance = context.InstanceDataMutator.Instance;
                DataElement dataElement = instance.Data.Find(x => x.DataType == "model")!;
                Model dataModel = new Model();
                InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                Guid datElementGuid = new Guid(dataElement.Id);

                dataElement = await dataClient.UnlockDataElement(instanceIdentifier, datElementGuid);
                dataElement = await dataClient.Update(instance, dataElement);

                dataModel.sf_API_Error = "error";
                dataElement = await dataClient.UpdateFormData(instance, dataModel, dataElement);
                dataElement = await dataClient.Update(instance, dataElement);

                dataElement = await dataClient.LockDataElement(instanceIdentifier, datElementGuid);
                await dataClient.Update(instance, dataElement);

                return Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks.ServiceTaskResult.FailedContinueProcessNext();
            }
        }
        """;

    private static readonly string[] _sfagTasks = ["Task_1:data", "Task_SfagApi:SfagApiServiceTask", "Task_Error:data"];

    // hdir/innsending-virksomheter-helfo App/logic/DataProcessing/ProcessTaskEnd.cs:360-378: an attachment of Task_1
    // is renamed with its own bytes at the end of Task_2.
    private const string RenameHook = """
        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId != "Task_2")
                {
                    return;
                }

                var dataElement = instance.Data.First(d => d.DataType == "vedlegg");
                var instanceIdentifier = new InstanceIdentifier(instance);
                var fileContent = await dataClient.GetDataBytes(instanceIdentifier.InstanceOwnerPartyId, instanceIdentifier.InstanceGuid, new Guid(dataElement.Id));
                using var fileStream = new MemoryStream(fileContent);
                await dataClient.UpdateBinaryData(instanceIdentifier, dataElement.ContentType, "nytt-navn.pdf", new Guid(dataElement.Id), fileStream);
            }
        }
        """;

    private const string RenameHookKept = $$"""
        public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId != "Task_2")
                {
                    return {{HandlerResult}}.Success();
                }

                var dataElement = instance.Data.First(d => d.DataType == "vedlegg");
                var instanceIdentifier = new InstanceIdentifier(instance);
                var fileContent = (await dataMutator.GetBinaryData(dataElement)).ToArray();
                using var fileStream = new MemoryStream(fileContent);
                await dataClient.UpdateBinaryData(instanceIdentifier, dataElement.ContentType, "nytt-navn.pdf", new Guid(dataElement.Id), fileStream);
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // nkr/fastbudsjett App/logic/dataProcessors/AppControlledDataCleanupProcessor.cs:40-50.
    private const string CleanupHook = """
        public class AppControlledDataCleanupProcessor(IDataClient dataClient) : IProcessEnd
        {
            public async Task End(Instance instance, List<InstanceEvent>? events)
            {
                DataElement appOwnedDataElement = instance.Data.FirstOrDefault(dataElement => dataElement.DataType == "Fast_Budsjett_AppControlled");
                if (appOwnedDataElement != null)
                {
                    InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                    int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                    await dataClient.DeleteData(instanceOwnerPartyId, instanceIdentifier.InstanceGuid, new Guid(appOwnedDataElement.Id), false);
                }
            }
        }
        """;

    private const string CleanupHookRewritten = $$"""
        public class AppControlledDataCleanupProcessor : {{IOnProcessEndedHandler}}
        {
            public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
            {
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                DataElement appOwnedDataElement = instance.Data.FirstOrDefault(dataElement => dataElement.DataType == "Fast_Budsjett_AppControlled");
                if (appOwnedDataElement != null)
                {
                    InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                    int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                    dataMutator.RemoveDataElement(appOwnedDataElement);
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    private const string CleanupHookKept = $$"""
        public class AppControlledDataCleanupProcessor(IDataClient dataClient) : {{IOnProcessEndedHandler}}
        {
            public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
            {
                Instance instance = context.InstanceDataMutator.Instance;
                DataElement appOwnedDataElement = instance.Data.FirstOrDefault(dataElement => dataElement.DataType == "Fast_Budsjett_AppControlled");
                if (appOwnedDataElement != null)
                {
                    InstanceIdentifier instanceIdentifier = new InstanceIdentifier(instance);
                    int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
                    await dataClient.DeleteData(instanceOwnerPartyId, instanceIdentifier.InstanceGuid, new Guid(appOwnedDataElement.Id), false);
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // nkr/faststatistikk App/logic/TaskProcessors/ProcessEnd.cs:18-44: the data type comes from the caller.
    private const string DeleteModelHook = """
        public static class Constants
        {
            public const string AppOwnedDataModelName = "Fast_Statistikk_AppOwned";
        }

        public class ProcessEnd(IDataClient dataClient) : IProcessEnd
        {
            public async Task End(Instance instance, List<InstanceEvent>? events)
            {
                await DeleteDataModel(Constants.AppOwnedDataModelName, instance);
            }

            private async Task DeleteDataModel(string dataModelName, Instance instance)
            {
                await dataClient.DeleteData(
                    int.Parse(instance.InstanceOwner.PartyId),
                    new Guid(instance.Id.Split("/")[1]),
                    new Guid(instance.Data.First(de => de.DataType == dataModelName).Id),
                    false
                );
            }
        }
        """;

    private const string DeleteModelHookKept = $$"""
        public static class Constants
        {
            public const string AppOwnedDataModelName = "Fast_Statistikk_AppOwned";
        }

        public class ProcessEnd(IDataClient dataClient) : {{IOnProcessEndedHandler}}
        {
            public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
            {
                Instance instance = context.InstanceDataMutator.Instance;
                await DeleteDataModel(Constants.AppOwnedDataModelName, instance);
                return {{HandlerResult}}.Success();
            }

            private async Task DeleteDataModel(string dataModelName, Instance instance)
            {
                await dataClient.DeleteData(
                    int.Parse(instance.InstanceOwner.PartyId),
                    new Guid(instance.Id.Split("/")[1]),
                    new Guid(instance.Data.First(de => de.DataType == dataModelName).Id),
                    false
                );
            }
        }
        """;

    // A DataCreation that adds a form, as dat/asbest-melding App/logic/InstantiationProcessor.cs adds its own.
    private const string ReceiptCreation = """
        public class Kvittering { }

        public class InstantiationProcessor(IDataClient dataClient) : IInstantiationProcessor
        {
            public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
            {
                var kvittering = new Kvittering();
                await dataClient.InsertFormData(instance, "kvittering", kvittering);
            }
        }
        """;

    private const string ReceiptCreationRewritten = $$"""
        public class Kvittering { }

        public class InstantiationProcessor : IInstantiationProcessor
        {
            public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
            {
                var kvittering = new Kvittering();
                dataMutator.AddFormDataElement("kvittering", kvittering);
            }
        }
        """;

    private const string ReceiptCreationKept = $$"""
        public class Kvittering { }

        public class InstantiationProcessor(IDataClient dataClient) : IInstantiationProcessor
        {
            public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
            {
                Instance instance = dataMutator.Instance;
                var kvittering = new Kvittering();
                await dataClient.InsertFormData(instance, "kvittering", kvittering);
            }
        }
        """;

    // A helper that two branches of a task end call, one for each task.
    private const string ReceiptHook = """
        public class Kvittering { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_1")
                {
                    await Mark(instance);
                }
                else if (taskId == "Task_2")
                {
                    await Mark(instance);
                }
            }

            private async Task Mark(Instance instance)
            {
                var element = instance.Data.First(d => d.DataType == "kvittering");
                await dataClient.UpdateFormData(instance, new Kvittering { A = "x" }, element);
            }
        }
        """;

    private const string ReceiptHookRewritten = $$"""
        public class Kvittering { public string? A { get; set; } }

        public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_1" || taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                if (taskId == "Task_1")
                {
                    await Mark(dataMutator);
                }
                else if (taskId == "Task_2")
                {
                    await Mark(dataMutator);
                }
                return {{HandlerResult}}.Success();
            }

            private async Task Mark({{IInstanceDataMutator}} dataMutator)
            {
                Instance instance = dataMutator.Instance;
                var element = instance.Data.First(d => d.DataType == "kvittering");
                await dataMutator.ReplaceFormData(element, new Kvittering { A = "x" });
            }
        }
        """;

    // The same helper, called by a task start for every task and by a task end for one.
    private const string ReceiptLifecycle = """
        public class Kvittering { public string? A { get; set; } }

        public class Lifecycle(IDataClient dataClient) : IProcessTaskStart, IProcessTaskEnd
        {
            public async Task Start(string taskId, Instance instance, Dictionary<string, string> prefill)
            {
                await Mark(instance);
            }

            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_2")
                {
                    await Mark(instance);
                }
            }

            private async Task Mark(Instance instance)
            {
                var element = instance.Data.First(d => d.DataType == "kvittering");
                await dataClient.UpdateFormData(instance, new Kvittering { A = "x" }, element);
            }
        }
        """;

    private const string ReceiptLifecycleRewritten = $$"""
        public class Kvittering { public string? A { get; set; } }

        public class Lifecycle : {{IOnTaskStartingHandler}}, {{IOnTaskEndingHandler}}
        {
            bool {{IOnTaskStartingHandler}}.ShouldRunForTask(string taskId) => true;

            public async Task<{{HandlerResult}}> Execute({{OnTaskStartingContext}} context)
            {
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                await Mark(dataMutator);
                return {{HandlerResult}}.Success();
            }

            bool {{IOnTaskEndingHandler}}.ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                if (taskId == "Task_2")
                {
                    await Mark(dataMutator);
                }
                return {{HandlerResult}}.Success();
            }

            private async Task Mark({{IInstanceDataMutator}} dataMutator)
            {
                Instance instance = dataMutator.Instance;
                var element = instance.Data.First(d => d.DataType == "kvittering");
                await dataMutator.ReplaceFormData(element, new Kvittering { A = "x" });
            }
        }
        """;

    private const string DeadBranchHook = """
        public class Kvittering { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId != "Task_2")
                {
                    return;
                }

                if (taskId == "Task_1")
                {
                    var element = instance.Data.First(d => d.DataType == "kvittering");
                    await dataClient.UpdateFormData(instance, new Kvittering { A = "x" }, element);
                }
            }
        }
        """;

    private const string DeadBranchHookRewritten = $$"""
        public class Kvittering { public string? A { get; set; } }

        public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => false;

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId != "Task_2")
                {
                    return {{HandlerResult}}.Success();
                }

                if (taskId == "Task_1")
                {
                    var element = instance.Data.First(d => d.DataType == "kvittering");
                    await dataMutator.ReplaceFormData(element, new Kvittering { A = "x" });
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // A form whose class two data types share, found by an id the code keeps in a data value.
    private const string SharedFormHook = """
        public class Skjema { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_2")
                {
                    var element = instance.Data.First(d => d.Id == instance.DataValues!["skjemaId"]);
                    await dataClient.UpdateFormData(instance, new Skjema { A = "x" }, element);
                }
            }
        }
        """;

    private const string SharedFormHookRewritten = $$"""
        public class Skjema { public string? A { get; set; } }

        public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId == "Task_2")
                {
                    var element = instance.Data.First(d => d.Id == instance.DataValues!["skjemaId"]);
                    await dataMutator.ReplaceFormData(element, new Skjema { A = "x" });
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    private const string SharedFormEnd = """
        public class Skjema { public string? A { get; set; } }

        public class ProcessEnd(IDataClient dataClient) : IProcessEnd
        {
            public async Task End(Instance instance, List<InstanceEvent>? events)
            {
                var element = instance.Data.First(d => d.Id == instance.DataValues!["skjemaId"]);
                await dataClient.UpdateFormData(instance, new Skjema { A = "x" }, element);
            }
        }
        """;

    private const string SharedFormEndKept = $$"""
        public class Skjema { public string? A { get; set; } }

        public class ProcessEnd(IDataClient dataClient) : {{IOnProcessEndedHandler}}
        {
            public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
            {
                Instance instance = context.InstanceDataMutator.Instance;
                var element = instance.Data.First(d => d.Id == instance.DataValues!["skjemaId"]);
                await dataClient.UpdateFormData(instance, new Skjema { A = "x" }, element);
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // A task end of a PDF service task writes the form of the task before it.
    private const string PdfTaskHook = """
        public class Skjema { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_Pdf")
                {
                    var element = instance.Data.First(d => d.DataType == "skjema");
                    await dataClient.UpdateFormData(instance, new Skjema { A = "x" }, element);
                }
            }
        }
        """;

    private const string PdfTaskHookKept = $$"""
        public class Skjema { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_Pdf";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                Instance instance = context.InstanceDataMutator.Instance;
                if (taskId == "Task_Pdf")
                {
                    var element = instance.Data.First(d => d.DataType == "skjema");
                    await dataClient.UpdateFormData(instance, new Skjema { A = "x" }, element);
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // A refused write next to the lock of an element of the hook's own task.
    private const string AttachmentLockHook = """
        public class Kvittering { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_2")
                {
                    var identifier = new InstanceIdentifier(instance);
                    var element = instance.Data.First(d => d.DataType == "kvittering");
                    await dataClient.UpdateFormData(instance, new Kvittering { A = "x" }, element);
                    var vedlegg = instance.Data.First(d => d.DataType == "vedlegg");
                    await dataClient.LockDataElement(identifier, Guid.Parse(vedlegg.Id));
                }
            }
        }
        """;

    private const string AttachmentLockHookKept = $$"""
        public class Kvittering { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId == "Task_2")
                {
                    var identifier = new InstanceIdentifier(instance);
                    var element = instance.Data.First(d => d.DataType == "kvittering");
                    await dataClient.UpdateFormData(instance, new Kvittering { A = "x" }, element);
                    var vedlegg = instance.Data.First(d => d.DataType == "vedlegg");
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // An add of another task's attachment whose element gets tags and Update, next to a delete of an element of the
    // hook's own task.
    private const string ReceiptAddHook = """
        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId != "Task_2")
                {
                    return;
                }

                var element = await dataClient.InsertBinaryData(instance.Id, "kvittering", "application/pdf", "k.pdf", new MemoryStream(new byte[] { 1 }));
                element.Tags = new List<string> { "receipt" };
                await dataClient.Update(instance, element);
                var utkast = instance.Data.First(d => d.DataType == "utkast");
                await dataClient.DeleteData(int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(instance.Id.Split('/')[1]), Guid.Parse(utkast.Id), false);
            }
        }
        """;

    private const string ReceiptAddHookKept = $$"""
        public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId != "Task_2")
                {
                    return {{HandlerResult}}.Success();
                }

                var element = await dataClient.InsertBinaryData(instance.Id, "kvittering", "application/pdf", "k.pdf", new MemoryStream(new byte[] { 1 }));
                element.Tags = new List<string> { "receipt" };
                await dataClient.Update(instance, element);
                var utkast = instance.Data.First(d => d.DataType == "utkast");
                dataMutator.RemoveDataElement(utkast);
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // An unlock, write and relock of a form found by an id the code keeps in a data value.
    private const string UnknownFormHook = """
        public class Model { public string? Saksnummer { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId != "Task_2")
                {
                    return;
                }

                var element = instance.Data.First(d => d.Id == instance.DataValues!["formId"]);
                var identifier = new InstanceIdentifier(instance);
                await dataClient.UnlockDataElement(identifier, Guid.Parse(element.Id));
                object form = await dataClient.GetFormData(instance, element);
                await dataClient.UpdateFormData(instance, form, element);
                await dataClient.LockDataElement(identifier, Guid.Parse(element.Id));
            }
        }
        """;

    private const string UnknownFormHookKept = $$"""
        public class Model { public string? Saksnummer { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId != "Task_2")
                {
                    return {{HandlerResult}}.Success();
                }

                var element = instance.Data.First(d => d.Id == instance.DataValues!["formId"]);
                var identifier = new InstanceIdentifier(instance);
                await dataClient.UnlockDataElement(identifier, Guid.Parse(element.Id));
                object form = await dataMutator.GetFormDataCopy(element);
                await dataClient.UpdateFormData(instance, form, element);
                await dataClient.LockDataElement(identifier, Guid.Parse(element.Id));
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // A write whose data type the code does not tell, next to an unlock and write of a form of the hook's task.
    private const string FormIdHook = """
        public class Model { public string? A { get; set; } }

        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_2")
                {
                    var identifier = new InstanceIdentifier(instance);
                    var model = instance.Data.First(d => d.DataType == "model");
                    await dataClient.UnlockDataElement(identifier, Guid.Parse(model.Id));
                    await dataClient.UpdateFormData(instance, new Model { A = "x" }, model);
                    var element = instance.Data.First(d => d.Id == instance.DataValues!["formId"]);
                    object form = await dataClient.GetFormData(instance, element);
                    await dataClient.UpdateFormData(instance, form, element);
                }
            }
        }
        """;

    private const string FormIdHookRewritten = $$"""
        public class Model { public string? A { get; set; } }

        public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId == "Task_2")
                {
                    var identifier = new InstanceIdentifier(instance);
                    var model = instance.Data.First(d => d.DataType == "model");
                    await dataMutator.ReplaceFormData(model, new Model { A = "x" });
                    var element = instance.Data.First(d => d.Id == instance.DataValues!["formId"]);
                    object form = await dataMutator.GetFormData(element);
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    // A helper that DataCreation and a task end share, in an app without autoCreate data types.
    private const string ReceiptReceipts = """
        public class Kvittering { }

        public class Receipts(IDataClient dataClient) : IInstantiationProcessor, IProcessTaskEnd
        {
            public async Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill)
            {
                await Add(instance);
            }

            public async Task End(string taskId, Instance instance)
            {
                if (taskId == "Task_2")
                {
                    await Add(instance);
                }
            }

            private async Task Add(Instance instance)
            {
                var kvittering = new Kvittering();
                await dataClient.InsertFormData(instance, "kvittering", kvittering);
            }
        }
        """;

    private const string ReceiptReceiptsRewritten = $$"""
        public class Kvittering { }

        public class Receipts : IInstantiationProcessor, {{IOnTaskEndingHandler}}
        {
            public async Task DataCreation({{IInstanceDataMutator}} dataMutator, object data, Dictionary<string, string>? prefill)
            {
                Instance instance = dataMutator.Instance;
                await Add(dataMutator);
            }

            public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                if (taskId == "Task_2")
                {
                    await Add(dataMutator);
                }
                return {{HandlerResult}}.Success();
            }

            private async Task Add({{IInstanceDataMutator}} dataMutator)
            {
                var kvittering = new Kvittering();
                dataMutator.AddFormDataElement("kvittering", kvittering);
            }
        }
        """;

    // brg/rrh-innrapportering App/logic/Process/CustomTaskEndProcessor.cs:125-139: the PDF element of an earlier task
    // is unlocked and deleted, found with Equals.
    private const string PdfCleanupHook = """
        public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
        {
            public async Task End(string taskId, Instance instance)
            {
                if (taskId.Equals("TaskBekreftelse"))
                {
                    DataElement pdfData = instance.Data.FirstOrDefault(d => d.DataType.Equals("ref-data-as-pdf"));
                    if (pdfData != null)
                    {
                        var pdfDataGuid = Guid.Parse(pdfData.Id);
                        var instanceGuid = new Guid(instance.Id.Split("/")[1]);
                        var partyId = int.Parse(instance.InstanceOwner.PartyId);
                        var instanceIdentifier = new InstanceIdentifier(instance);
                        await dataClient.UnlockDataElement(instanceIdentifier, pdfDataGuid);
                        await dataClient.DeleteData(partyId, instanceGuid, pdfDataGuid, false);
                    }
                }
            }
        }
        """;

    private const string PdfCleanupHookRewritten = $$"""
        public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
        {
            public bool ShouldRunForTask(string taskId) => taskId == "TaskBekreftelse";

            public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
            {
                string taskId = context.TaskId;
                {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                Instance instance = dataMutator.Instance;
                if (taskId.Equals("TaskBekreftelse"))
                {
                    DataElement pdfData = instance.Data.FirstOrDefault(d => d.DataType.Equals("ref-data-as-pdf"));
                    if (pdfData != null)
                    {
                        var pdfDataGuid = Guid.Parse(pdfData.Id);
                        var instanceGuid = new Guid(instance.Id.Split("/")[1]);
                        var partyId = int.Parse(instance.InstanceOwner.PartyId);
                        var instanceIdentifier = new InstanceIdentifier(instance);
                        dataMutator.RemoveDataElement(new {{DataElementIdentifier}}(pdfDataGuid));
                    }
                }
                return {{HandlerResult}}.Success();
            }
        }
        """;

    public static TheoryData<string, string, string, string[], string> Accepted =>
        new()
        {
            {
                "a data type without taskIds",
                CaseNumberHook,
                Metadata(Form("AllocatedCaseNumber", "App.Logic.AllocatedCaseNumber")),
                _patentTasks,
                CaseNumberHookRewritten
            },
            {
                "a data type whose taskIds list one of the hook's tasks",
                CaseNumberHook,
                Metadata(
                    Form(
                        "AllocatedCaseNumber",
                        "App.Logic.AllocatedCaseNumber",
                        "\"taskIds\": [\"Task_FillOutForm\", \"Task_Payment\"]"
                    )
                ),
                _patentTasks,
                CaseNumberHookRewritten
            },
            {
                "a helper whose type is bound to the task of one of the calls that lead to it",
                ReceiptHook,
                Metadata(Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_2\"")),
                ["Task_1", "Task_2"],
                ReceiptHookRewritten
            },
            {
                "a helper that a hook running at every task calls",
                ReceiptLifecycle,
                Metadata(Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_1\"")),
                ["Task_1", "Task_2"],
                ReceiptLifecycleRewritten
            },
            {
                "a write that no task reaches",
                DeadBranchHook,
                Metadata(Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_1\"")),
                ["Task_1", "Task_2"],
                DeadBranchHookRewritten
            },
            {
                "a form whose class one data type bound to the hook's task shares",
                SharedFormHook,
                Metadata(
                    Form("skjema", "App.Logic.Skjema", "\"taskId\": \"Task_2\""),
                    Form("utkast", "App.Logic.Skjema", "\"taskId\": \"Task_1\"")
                ),
                ["Task_1", "Task_2"],
                SharedFormHookRewritten
            },
            {
                "a write whose data type the code does not tell, next to an unlock of another element",
                FormIdHook,
                Metadata(Form("model", "App.Logic.Model", "\"taskId\": \"Task_2\"")),
                ["Task_1", "Task_2"],
                FormIdHookRewritten
            },
            {
                "an unlock and delete of an element of a data type without taskIds, looked up with Equals",
                PdfCleanupHook,
                Metadata("{ \"id\": \"ref-data-as-pdf\" }"),
                ["Task_1", "TaskBekreftelse"],
                PdfCleanupHookRewritten
            },
            {
                "a delete at process end of a data type deleted at process end",
                CleanupHook,
                Metadata(
                    Form(
                        "Fast_Budsjett_AppControlled",
                        "App.Logic.Model",
                        "\"taskId\": \"Task_1\"",
                        "\"autoDeleteOnProcessEnd\": true"
                    )
                ),
                ["Task_1"],
                CleanupHookRewritten
            },
            {
                "a form DataCreation adds, bound to the task of an autoCreate type",
                ReceiptCreation,
                Metadata(
                    Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"", "\"autoCreate\": true"),
                    Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_1\"")
                ),
                ["Task_1", "Task_2"],
                ReceiptCreationRewritten
            },
            {
                "a form DataCreation adds, bound to a later task that has an autoCreate type too",
                ReceiptCreation,
                Metadata(
                    Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"", "\"autoCreate\": true"),
                    Form("svar", "App.Logic.Svar", "\"taskId\": \"Task_2\"", "\"autoCreate\": true"),
                    Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_2\"")
                ),
                ["Task_1", "Task_2"],
                ReceiptCreationRewritten
            },
            {
                "a helper that a task end and DataCreation without an autoCreate type call",
                ReceiptReceipts,
                Metadata(Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_1\"")),
                ["Task_1", "Task_2"],
                ReceiptReceiptsRewritten
            },
        };

    [Theory]
    [MemberData(nameof(Accepted))]
    public void AWriteV9AcceptsAtATaskItRunsAt_IsRewritten(
        string label,
        string source,
        string metadata,
        string[] tasks,
        string after
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, metadata);
        _app.Write(ProcessPath, Process(tasks));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Empty(result.Todos);
    }

    public static TheoryData<string, string, string, string[], string, string, string> Refused =>
        new()
        {
            {
                "a task end writes the form of an earlier task through a helper that unlocks and relocks it",
                CaseNumberHook,
                Metadata(
                    Form("AllocatedCaseNumber", "App.Logic.AllocatedCaseNumber", "\"taskId\": \"Task_FillOutForm\"")
                ),
                _patentTasks,
                CaseNumberHookKept,
                "await dataClient.UpdateData(model,",
                "IDataClient.UpdateData writes AllocatedCaseNumber, which is bound to Task_FillOutForm, while Task_Signature or "
                    + "Task_Payment is the current task. v9 refuses data element writes outside the type's tasks, in process "
                    + "transitions too. Make the write in a hook of Task_FillOutForm, move the value to a data type bound to "
                    + "Task_Signature and Task_Payment (or one with no taskIds), or add Task_Signature and Task_Payment to "
                    + "AllocatedCaseNumber's taskIds. That last option lets users edit it in Task_Signature or Task_Payment, "
                    + "validates it at the end of Task_Signature or Task_Payment and adds it to that task's PDF. It was left as "
                    + "it is, and so were the other client calls on its element at lines "
                    + $"{Line(CaseNumberHook, "UnlockDataElement")} and {Line(CaseNumberHook, "LockDataElement")}. Remove "
                    + "them with the write: each fix above makes them unnecessary."
            },
            {
                "a task end writes the form it looked up by data type",
                ScrubHook,
                Metadata(
                    Form("model", "App.Logic.model", "\"taskId\": \"Task_1\"", null, "\"enablePdfCreation\": false")
                ),
                ["Task_1", "Task_2"],
                ScrubHookKept,
                "await data.UpdateData(model,",
                "IDataClient.UpdateData writes model, which is bound to Task_1, while Task_2 is the current task. v9 refuses "
                    + "data element writes outside the type's tasks, in process transitions too. Make the write in a hook of "
                    + "Task_1, move the value to a data type bound to Task_2 (or one with no taskIds), or add Task_2 to model's "
                    + "taskIds. That last option lets users edit it in Task_2 and validates it at the end of Task_2. It was "
                    + "left as it is, and so were the other client calls on its element at lines "
                    + $"{Line(ScrubHook, "UnlockDataElement")} and {Line(ScrubHook, "LockDataElement")}. Remove them with "
                    + "the write: each fix above makes them unnecessary."
            },
            {
                "an abandon writes the form of another task",
                RestoreHook,
                Metadata(Form("innrapporteringFRIV", "App.Logic.InnrapporteringFRIV", "\"taskId\": \"utfylling\"")),
                ["utfylling", "signee_selection", "dataValidation"],
                RestoreHookKept,
                "await dataClient.UpdateFormData(instance, backupData, hovedskjemaDataElement);",
                "IDataClient.UpdateFormData writes innrapporteringFRIV, which is bound to utfylling, while signee_selection "
                    + "is the current task. v9 refuses data element writes outside the type's tasks, in process transitions "
                    + "too. Make the write in a hook of utfylling, move the value to a data type bound to signee_selection (or "
                    + "one with no taskIds), or add signee_selection to innrapporteringFRIV's taskIds. That last option lets "
                    + "users edit it in signee_selection, validates it at the end of signee_selection and adds it to that "
                    + "task's PDF. It was left as it is, and so was the other client call on its element at line "
                    + $"{Line(RestoreHook, "UnlockDataElement")}. Remove it with the write: each fix above makes it "
                    + "unnecessary."
            },
            {
                "a service task writes the form of another task",
                SfagServiceTask,
                Metadata(Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"")),
                _sfagTasks,
                SfagServiceTask,
                "dataElement = await dataClient.UpdateFormData(instance, dataModel, dataElement);",
                "IDataClient.UpdateFormData writes model, which is bound to Task_1, while Task_SfagApi is the current task. v9 "
                    + "refuses data element writes outside the type's tasks, in process transitions too. Make the write in a "
                    + "hook of Task_1, move the value to a data type bound to Task_SfagApi (or one with no taskIds), or add "
                    + "Task_SfagApi to model's taskIds. It was left as it is, and so were the other client calls on its "
                    + $"element at lines {Line(SfagServiceTask, "UnlockDataElement")}, "
                    + $"{Line(SfagServiceTask, "UnlockDataElement") + 1}, {Line(SfagServiceTask, "UpdateFormData") + 1}, "
                    + $"{Line(SfagServiceTask, "LockDataElement(")} and {Line(SfagServiceTask, "LockDataElement(") + 1}. "
                    + "Remove them with the write: each fix above makes them unnecessary."
            },
            {
                "a task end renames an attachment of an earlier task with its own bytes",
                RenameHook,
                Metadata("{ \"id\": \"vedlegg\", \"taskId\": \"Task_1\" }"),
                ["Task_1", "Task_2"],
                RenameHookKept,
                "await dataClient.UpdateBinaryData(",
                "IDataClient.UpdateBinaryData writes vedlegg, which is bound to Task_1, while Task_2 is the current task. v9 "
                    + "refuses data element writes outside the type's tasks, in process transitions too. Make the write in a "
                    + "hook of Task_1, move the value to a data type bound to Task_2 (or one with no taskIds), or add Task_2 "
                    + "to vedlegg's taskIds. That last option lets users edit it in Task_2 and validates it at the end of "
                    + "Task_2."
            },
            {
                "a process end deletes a form bound to a task",
                CleanupHook,
                Metadata(Form("Fast_Budsjett_AppControlled", "App.Logic.Model", "\"taskId\": \"Task_1\"")),
                ["Task_1"],
                CleanupHookKept,
                "await dataClient.DeleteData(",
                "IDataClient.DeleteData deletes Fast_Budsjett_AppControlled at process end, when there is no current task; v9 "
                    + "refuses that for a type bound to Task_1. Set autoDeleteOnProcessEnd on Fast_Budsjett_AppControlled so "
                    + "that v9 deletes it when the process ends instead."
            },
            {
                "a process end deletes a form by the data type its caller passes",
                DeleteModelHook,
                Metadata(Form("Fast_Statistikk_AppOwned", "App.Logic.Model", "\"taskId\": \"Task_1\"")),
                ["Task_1"],
                DeleteModelHookKept,
                "await dataClient.DeleteData(",
                "IDataClient.DeleteData deletes Fast_Statistikk_AppOwned at process end, when there is no current task; v9 "
                    + "refuses that for a type bound to Task_1. Set autoDeleteOnProcessEnd on Fast_Statistikk_AppOwned so that "
                    + "v9 deletes it when the process ends instead."
            },
            {
                "DataCreation adds a form bound to a later task",
                ReceiptCreation,
                Metadata(
                    Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"", "\"autoCreate\": true"),
                    Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_2\"")
                ),
                ["Task_1", "Task_2"],
                ReceiptCreationKept,
                "await dataClient.InsertFormData(",
                "IDataClient.InsertFormData writes kvittering, which is bound to Task_2, while Task_1 is the current task. v9 "
                    + "refuses data element writes outside the type's tasks, in process transitions too. Make the write in a "
                    + "hook of Task_2, move the value to a data type bound to Task_1 (or one with no taskIds), or add Task_1 to "
                    + "kvittering's taskIds. That last option lets users edit it in Task_1, validates it at the end of Task_1 "
                    + "and adds it to that task's PDF."
            },
            {
                "a task end of a PDF service task writes the form of another task",
                PdfTaskHook,
                Metadata(Form("skjema", "App.Logic.Skjema", "\"taskId\": \"Task_1\"")),
                ["Task_1", "Task_Pdf:pdf"],
                PdfTaskHookKept,
                "await dataClient.UpdateFormData(",
                "IDataClient.UpdateFormData writes skjema, which is bound to Task_1, while Task_Pdf is the current task. v9 "
                    + "refuses data element writes outside the type's tasks, in process transitions too. Make the write in a "
                    + "hook of Task_1, move the value to a data type bound to Task_Pdf (or one with no taskIds), or add "
                    + "Task_Pdf to skjema's taskIds."
            },
            {
                "a process end writes a form whose class two bound data types share",
                SharedFormEnd,
                Metadata(
                    Form("skjema", "App.Logic.Skjema", "\"taskId\": \"Task_2\""),
                    Form("utkast", "App.Logic.Skjema", "\"taskId\": \"Task_1\"")
                ),
                ["Task_1", "Task_2"],
                SharedFormEndKept,
                "await dataClient.UpdateFormData(",
                "IDataClient.UpdateFormData writes skjema or utkast at process end, when there is no current task; v9 "
                    + "refuses that for types bound to Task_2 and Task_1. Make the write at the end of Task_2 or Task_1 "
                    + "instead."
            },
            {
                "a task end writes the form of another task and locks an element of its own task",
                AttachmentLockHook,
                Metadata(
                    Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_1\""),
                    "{ \"id\": \"vedlegg\", \"taskId\": \"Task_2\" }"
                ),
                ["Task_1", "Task_2"],
                AttachmentLockHookKept,
                "await dataClient.UpdateFormData(",
                "IDataClient.UpdateFormData writes kvittering, which is bound to Task_1, while Task_2 is the current task. "
                    + "v9 refuses data element writes outside the type's tasks, in process transitions too. Make the write in "
                    + "a hook of Task_1, move the value to a data type bound to Task_2 (or one with no taskIds), or add Task_2 "
                    + "to kvittering's taskIds. That last option lets users edit it in Task_2, validates it at the end of "
                    + "Task_2 and adds it to that task's PDF."
            },
            {
                "a task end adds an attachment of another task and updates the element it adds",
                ReceiptAddHook,
                Metadata(
                    "{ \"id\": \"kvittering\", \"taskId\": \"Task_1\" }",
                    "{ \"id\": \"utkast\", \"taskId\": \"Task_2\" }"
                ),
                ["Task_1", "Task_2"],
                ReceiptAddHookKept,
                "await dataClient.InsertBinaryData(",
                "IDataClient.InsertBinaryData writes kvittering, which is bound to Task_1, while Task_2 is the current "
                    + "task. v9 refuses data element writes outside the type's tasks, in process transitions too. Make the "
                    + "write in a hook of Task_1, move the value to a data type bound to Task_2 (or one with no taskIds), or "
                    + "add Task_2 to kvittering's taskIds. That last option lets users edit it in Task_2 and validates it at "
                    + "the end of Task_2. It was left as it is, and so was the client call on the element it adds at line "
                    + $"{Line(ReceiptAddHook, "dataClient.Update(")}, which goes with it."
            },
            {
                "a task end unlocks, writes and relocks a form whose data type the code does not tell",
                UnknownFormHook,
                Metadata(Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"")),
                ["Task_1", "Task_2"],
                UnknownFormHookKept,
                "await dataClient.UpdateFormData(",
                "IDataClient.UpdateFormData writes an element whose data type the upgrade could not tell. The method "
                    + "unlocks it first, so it belongs to another task: v9 unlocks a task's data when the task starts and "
                    + "locks it after the task-end handlers, and refuses data element writes outside the type's tasks, in "
                    + "process transitions too. Make the write in a hook of a task the type is bound to, move the value to a "
                    + "data type bound to the task this code runs in (or one with no taskIds), or add that task to the "
                    + "type's taskIds. It was left as it is, and so were the other client calls on its element at lines "
                    + $"{Line(UnknownFormHook, "UnlockDataElement")} and {Line(UnknownFormHook, "LockDataElement")}. Remove "
                    + "them with the write: each fix above makes them unnecessary."
            },
        };

    [Theory]
    [MemberData(nameof(Refused))]
    public void AWriteV9RefusesAtEveryTaskItRunsAt_StaysWithItsLocks_AndIsATodo(
        string label,
        string source,
        string metadata,
        string[] tasks,
        string after,
        string anchor,
        string text
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, metadata);
        _app.Write(ProcessPath, Process(tasks));

        var result = Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Todo, text), result.Messages);
    }

    public static TheoryData<string, string, string, string> NotChecked =>
        new()
        {
            {
                "a write with another token",
                """
                    public class Kvittering { public string? A { get; set; } }

                    public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            if (taskId == "Task_2")
                            {
                                var element = instance.Data.First(d => d.DataType == "kvittering");
                                await dataClient.UpdateFormData(instance, new Kvittering { A = "x" }, element, StorageAuthenticationMethod.CurrentUser());
                            }
                        }
                    }
                    """,
                "await dataClient.UpdateFormData(",
                "IDataClient.UpdateFormData uses StorageAuthenticationMethod.CurrentUser() to reach Storage; the engine "
                    + "saves as the app; set dataMutator.OverrideAuthenticationMethod(dataType, …) if this data type needs "
                    + "another token."
            },
            {
                "a write to an instance the upgrade cannot tell is this one",
                """
                    public class Kvittering { }

                    public class ProcessTaskEnd(IDataClient dataClient, IInstanceClient instanceClient) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            if (taskId == "Task_2")
                            {
                                var other = await instanceClient.GetInstance("app", "org", 1, Guid.NewGuid());
                                await dataClient.InsertFormData(other, "kvittering", new Kvittering());
                            }
                        }
                    }
                    """,
                "await dataClient.InsertFormData(",
                "IDataClient.InsertFormData still writes to Storage directly in ProcessTaskEnd.End: the upgrade could not "
                    + "tell which instance other refers to. If it is this instance, use dataMutator.AddFormDataElement, since "
                    + "v9 refuses direct writes to it while the process is transitioning; if it is another instance, keep the "
                    + "call out of the transition."
            },
        };

    [Theory]
    [MemberData(nameof(NotChecked))]
    public void OnlyAWriteToThisInstanceWithTheAppsToken_IsCheckedAgainstTheBinding(
        string label,
        string source,
        string anchor,
        string text
    )
    {
        _ = label;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, Metadata(Form("kvittering", "App.Logic.Kvittering", "\"taskId\": \"Task_1\"")));
        _app.Write(ProcessPath, Process("Task_1", "Task_2"));

        var result = Port(AppFolder);

        Assert.Contains(At(source, anchor, UpgradeMessageStatus.Todo, text), result.Messages);
    }

    [Fact]
    public void ARefusedWriteBeforeAServiceTaskFailure_IsWarnedAboutAsAMovedOneIs()
    {
        _app.Write(HookPath, InApp(SfagServiceTask));
        _app.Write(MetadataPath, Metadata(Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"")));
        _app.Write(ProcessPath, Process(_sfagTasks));

        var result = Port(AppFolder);

        Assert.Contains(
            At(
                SfagServiceTask,
                "dataElement = await dataClient.UpdateFormData(instance, dataModel, dataElement);",
                UpgradeMessageStatus.Warning,
                "IDataClient.UpdateFormData is saved only if the service task succeeds: v9 keeps nothing from an attempt "
                    + "that returns a failure. If it must be stored, return ServiceTaskResult.Success with the action the "
                    + "failure leads to."
            ),
            result.Messages
        );
    }

    [Fact]
    public void ANoOpUpdate_GoesWhereverItsDataTypeIsBound()
    {
        // krt/krt-1026a-1 App/logic/SfagAPI/SfagApiServiceTask.cs:61-62, with the element looked up in the call.
        var source = """
            public class ProcessTaskEnd(IDataClient dataClient) : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    if (taskId == "Task_2")
                    {
                        var dataElement = await dataClient.LockDataElement(new InstanceIdentifier(instance), new Guid(instance.Data.First(d => d.DataType == "model").Id));
                        await dataClient.Update(instance, dataElement);
                    }
                }
            }
            """;
        _app.Write(HookPath, InApp(source));
        _app.Write(MetadataPath, Metadata(Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"")));
        _app.Write(ProcessPath, Process("Task_1", "Task_2"));

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                {
                    public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

                    public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                    {
                        string taskId = context.TaskId;
                        {{IInstanceDataMutator}} dataMutator = context.InstanceDataMutator;
                        Instance instance = dataMutator.Instance;
                        if (taskId == "Task_2")
                        {
                            var dataElement = dataMutator.GetDataElement(instance.Data.First(d => d.DataType == "model"));
                        }
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read(HookPath)
        );
        Assert.Empty(result.Todos);
    }

    [Fact]
    public void APackageHookThatWritesBoundFormsAtProcessEnd_ItsTodoSaysWhatThePackageMustDoInstead()
    {
        // krt ×13 App/Program.cs:27 services.AddTransient<IProcessEnd, XsdMetadataGenerator>();
        _app.Write(
            "Program.cs",
            ProcessHookStubs.Program(
                "services.AddTransient<IProcessEnd, Ft.Datafangst.Utils.Application.XsdMetadataGenerator>();"
            )
        );
        _app.Write("logic/Model.cs", ProcessHookStubs.InApp("public class Model { }"));
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Ft.Datafangst.Utils" Version="2.1.4" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            MetadataPath,
            Metadata(
                "{ \"id\": \"ref-data-as-pdf\" }",
                Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\""),
                Form("modelUnderskjema", "App.Logic.ModelUnderskjema", "\"taskId\": \"Task_1\"")
            )
        );

        var result = ProcessHookStubs.Port(AppFolder, _xsdMetadataGenerator.Value);

        Assert.Equal(
            [
                ProcessHookStubs.Todo(
                    "Program.cs:11: Ft.Datafangst.Utils 2.1.4 implements IProcessEnd in XsdMetadataGenerator, which the app "
                        + "registers here; v9 removed that interface, so the app needs a v9 version of the package. The "
                        + "registration was left unchanged. XsdMetadataGenerator.End updates model and modelUnderskjema at "
                        + "process end, when there is no current task; v9 refuses that for types bound to Task_1. Set the "
                        + "metadata at the end of Task_1 instead."
                ),
            ],
            result.Messages
        );
    }

    [Fact]
    public void AnAppClassDerivedFromAPackageHookThatWritesBoundFormsAtProcessEnd_ItsTodoSaysWhatThePackageMustDoInstead()
    {
        var source = ProcessHookStubs.InApp(
            """
            public class Model { }

            public class MetadataGenerator : Ft.Datafangst.Utils.Application.XsdMetadataGenerator
            {
            }
            """
        );
        _app.Write(HookPath, source);
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Ft.Datafangst.Utils" Version="2.1.4" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(MetadataPath, Metadata(Form("model", "App.Logic.Model", "\"taskId\": \"Task_1\"")));

        var result = ProcessHookStubs.Port(AppFolder, _xsdMetadataGenerator.Value);

        Assert.Contains(
            ProcessHookStubs.Todo(
                $"{HookPath}:{LineOf(source, "public class MetadataGenerator")}: MetadataGenerator derives from Ft.Datafangst.Utils 2.1.4 XsdMetadataGenerator, which sets element "
                    + "metadata with IDataClient.Update, and v9 refuses that while the process is transitioning. The "
                    + "package owner must set the metadata with dataMutator.UpdateDataElementMetadata in an "
                    + "IOnTaskEndingHandler of the forms' task; until then this class fails in v9. "
                    + "XsdMetadataGenerator.End updates model at process end, when there is no current task; v9 refuses "
                    + "that for a type bound to Task_1. Set the metadata at the end of Task_1 instead."
            ),
            result.Messages
        );
    }

    [Fact]
    public void APackageThatRegistersAHookThatDeletesBoundFormsAtProcessEnd_ItsTodoSaysWhatThePackageMustDoInstead()
    {
        // dat/forhandsmelding App/Program.cs:40 services.AddPatchDialogTask<…>(env);
        _app.Write("Program.cs", ProcessHookStubs.Program("services.AddPatchDialogTask();"));
        _app.Write("logic/Model.cs", ProcessHookStubs.InApp("public class Model { }"));
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Arbeidstilsynet.Common.AltinnApp" Version="2.9.0-alpha7" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            MetadataPath,
            Metadata(Form("skjema", "App.Logic.Model", "\"taskId\": \"Task_1\""), "{ \"id\": \"structured-data\" }")
        );

        var result = ProcessHookStubs.Port(AppFolder, _structuredDataManager.Value);

        Assert.Contains(
            ProcessHookStubs.Todo(
                "Program.cs:11: org/app: Arbeidstilsynet.Common.AltinnApp 2.9.0-alpha7 registers StructuredDataManager "
                    + "through AddPatchDialogTask, and StructuredDataManager implements IProcessTaskEnd, which v9 removed or "
                    + "moved; it reads, adds and deletes data elements and writes data values with IDataClient and "
                    + "IInstanceClient, and registers IProcessTaskEnd and IProcessEnd handlers. The app needs a v9 version of "
                    + "the package: its owner must port it to the v9 handlers and IInstanceDataMutator. "
                    + "StructuredDataManager.End deletes skjema at process end; v9 refuses that for a type bound to Task_1. "
                    + "Set autoDeleteOnProcessEnd on skjema and KeepAppDataModelAfterMapping = true so v9 deletes it instead."
            ),
            result.Messages
        );
    }

    /// <summary>
    /// Arbeidstilsynet.Common.AltinnApp 2.9.0's hook, which deletes the form at process end, and the registration that
    /// adds it.
    /// </summary>
    private static readonly Lazy<MetadataReference> _structuredDataManager = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "AT.Common.AltinnApp.Publish",
            """
            using System.Collections.Generic;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.Platform.Storage.Interface.Models;
            using Microsoft.Extensions.DependencyInjection;

            [assembly: System.Reflection.AssemblyVersion("2.9.0.0")]

            namespace Arbeidstilsynet.Common.AltinnApp.Implementation
            {
                public class StructuredDataManager<TDataModel, TStructuredData> : IProcessTaskEnd, IProcessEnd
                {
                    public Task End(string taskId, Instance instance) => Task.CompletedTask;

                    public Task End(Instance instance, List<InstanceEvent>? events) => Task.CompletedTask;
                }
            }

            namespace Microsoft.Extensions.DependencyInjection
            {
                public static class PatchDialogTaskExtensions
                {
                    public static IServiceCollection AddPatchDialogTask(this IServiceCollection services) => services;
                }
            }
            """,
            ProcessHookStubs.V8
        )
    );

    /// <summary>Ft.Datafangst.Utils 2.1.4's process-end hook, which sets the forms' metadata with IDataClient.</summary>
    private static readonly Lazy<MetadataReference> _xsdMetadataGenerator = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Utils",
            """
            using System.Collections.Generic;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.Platform.Storage.Interface.Models;

            [assembly: System.Reflection.AssemblyVersion("2.1.4.0")]

            namespace Ft.Datafangst.Utils.Application
            {
                public class XsdMetadataGenerator : IProcessEnd
                {
                    public Task End(Instance instance, List<InstanceEvent>? events) => Task.CompletedTask;
                }
            }
            """,
            ProcessHookStubs.V8
        )
    );

    private static int Line(string source, string text) => LineOf(InApp(source), text);

    /// <summary>A form data type: its id, class, the properties next to <c>appLogic</c> and those in it.</summary>
    private static string Form(
        string id,
        string classRef,
        string? binding = null,
        string? appLogic = null,
        string? other = null
    ) =>
        "{ "
        + $"\"id\": \"{id}\", "
        + (binding is null ? "" : $"{binding}, ")
        + (other is null ? "" : $"{other}, ")
        + $"\"appLogic\": {{ \"classRef\": \"{classRef}\"{(appLogic is null ? "" : $", {appLogic}")} }}"
        + " }";

    private static string Metadata(params string[] dataTypes) =>
        $$"""
            {
              "id": "org/app",
              "dataTypes": [ {{string.Join(", ", dataTypes)}} ]
            }
            """;

    /// <summary>
    /// A process that runs <paramref name="tasks"/> one after another from its start event; <c>id:type</c> gives a
    /// task its <c>altinn:taskType</c>.
    /// </summary>
    private static string Process(params string[] tasks)
    {
        var ids = tasks.Select(static task => task.Split(':')[0]).ToList();
        var elements = tasks.Select(static task =>
            task.Split(':') is [var id, var type]
                ? $"<bpmn:task id=\"{id}\"><bpmn:extensionElements><altinn:taskExtension><altinn:taskType>{type}"
                    + "</altinn:taskType></altinn:taskExtension></bpmn:extensionElements></bpmn:task>"
                : $"<bpmn:task id=\"{task}\" />"
        );
        var flows = ids.Prepend("StartEvent")
            .Zip(ids.Append("EndEvent"))
            .Select(
                static (flow, i) =>
                    $"<bpmn:sequenceFlow id=\"Flow_{i}\" sourceRef=\"{flow.First}\" targetRef=\"{flow.Second}\" />"
            );
        return $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions">
              <bpmn:process id="Process">
                <bpmn:startEvent id="StartEvent" />
                {string.Join("", elements)}
                <bpmn:endEvent id="EndEvent" />
                {string.Join("", flows)}
              </bpmn:process>
            </bpmn:definitions>
            """;
    }
}
