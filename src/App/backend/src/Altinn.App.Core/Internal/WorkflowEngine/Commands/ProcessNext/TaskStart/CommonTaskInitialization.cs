using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

/// <summary>
/// Payload for the CommonTaskInitialization command.
/// </summary>
/// <param name="Prefill">Prefill data for the initial task start. Null for subsequent task transitions.</param>
internal sealed record CommonTaskInitializationPayload(Dictionary<string, string>? Prefill) : CommandRequestPayload;

internal sealed class CommonTaskInitialization : WorkflowEngineCommandBase<CommonTaskInitializationPayload>
{
    public static string Key => "CommonTaskInitialization";

    public override string GetKey() => Key;

    private readonly IAppMetadata _appMetadata;
    private readonly IPrefill _prefillService;
    private readonly IAppModel _appModel;
    private readonly AppImplementationFactory _appImplementationFactory;

    public CommonTaskInitialization(
        IAppMetadata appMetadata,
        IPrefill prefillService,
        IAppModel appModel,
        IServiceProvider serviceProvider
    )
    {
        _appMetadata = appMetadata;
        _prefillService = prefillService;
        _appModel = appModel;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        CommonTaskInitializationPayload payload
    )
    {
        IInstanceDataMutator instanceDataMutator = context.InstanceDataMutator;
        Instance instance = instanceDataMutator.Instance;
        string taskId = instance.Process.CurrentTask.ElementId;

        RemoveDataElementsGeneratedFromTask(instanceDataMutator, taskId);

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        foreach (
            DataType dataType in applicationMetadata.DataTypes.Where(dt =>
                dt.TaskId == taskId && dt.AppLogic?.AutoCreate == true
            )
        )
        {
            DataElement? dataElement = instance.Data?.Find(d => d.DataType == dataType.Id);
            if (dataElement != null)
            {
                continue;
            }

            object data = _appModel.Create(dataType.AppLogic.ClassRef);

            await _prefillService.PrefillDataModel(instance.InstanceOwner.PartyId, dataType.Id, data, payload.Prefill);
            var instantiationProcessor = _appImplementationFactory.GetRequired<IInstantiationProcessor>();
            await instantiationProcessor.DataCreation(instance, data, payload.Prefill);

            instanceDataMutator.AddFormDataElement(dataType.Id, data);
        }

        return new SuccessfulProcessEngineCommandResult();
    }

    private static void RemoveDataElementsGeneratedFromTask(IInstanceDataMutator instanceDataMutator, string taskId)
    {
        Instance instance = instanceDataMutator.Instance;
        var dataElements =
            instance.Data?.Where(de =>
                de.References?.Exists(r => r.ValueType == ReferenceType.Task && r.Value == taskId) is true
            )
            ?? [];

        foreach (var dataElement in dataElements)
        {
            instanceDataMutator.RemoveDataElement(dataElement);
        }
    }
}
