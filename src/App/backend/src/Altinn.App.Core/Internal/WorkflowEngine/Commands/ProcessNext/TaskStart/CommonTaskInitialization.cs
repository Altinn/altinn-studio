using System.Text.Json.Serialization;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.DataProcessing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

/// <summary>
/// Payload for the CommonTaskInitialization command.
/// </summary>
/// <param name="Prefill">Prefill data for the initial task start. Null for subsequent task transitions.</param>
/// <param name="IsInstantiation">
/// Whether the step belongs to the workflow that creates the instance. Left out of the JSON when false, so that every
/// other task start keeps the payload the engine hashes.
/// </param>
internal sealed record CommonTaskInitializationPayload(
    Dictionary<string, string>? Prefill,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)] bool IsInstantiation = false
) : CommandRequestPayload;

internal sealed class CommonTaskInitialization : WorkflowEngineCommandBase<CommonTaskInitializationPayload>
{
    public static string Key => "CommonTaskInitialization";

    public override string GetKey() => Key;

    private readonly IAppMetadata _appMetadata;
    private readonly IPrefill _prefillService;
    private readonly IAppModel _appModel;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IServiceProvider _serviceProvider;

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
        _serviceProvider = serviceProvider;
    }

    public override async Task<WorkflowEngineCommandResult> Execute(
        WorkflowEngineCommandContext context,
        CommonTaskInitializationPayload payload
    )
    {
        ApplicationMetadata applicationMetadata = _appMetadata.ApplicationMetadata;
        IInstanceDataMutator instanceDataMutator = context.InstanceDataMutator;
        Instance instance = instanceDataMutator.Instance;
        string taskId = instance.Process.CurrentTask.ElementId;
        var created = new List<DataElementChange>();

        foreach (
            DataType dataType in applicationMetadata.DataTypes.Where(dt =>
                dt.IsBoundToTask(taskId) && dt.AppLogic?.AutoCreate == true
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
            try
            {
                await instantiationProcessor.DataCreation(instanceDataMutator, data, payload.Prefill);
            }
            // A request waits for this step, and app code that throws here rarely gets past it on a retry, so the
            // request gets its answer at once, as in v8. A later task start keeps its retries, since a deploy of
            // fixed code then lets the instance go on by itself.
            catch (Exception exception)
                when (payload.IsInstantiation && !context.CancellationToken.IsCancellationRequested)
            {
                return FailedWorkflowEngineCommandResult.Permanent(
                    exception,
                    $"{nameof(IInstantiationProcessor)}.{nameof(IInstantiationProcessor.DataCreation)} failed for "
                        + $"data type '{dataType.Id}': {exception.Message}"
                );
            }

            if (instanceDataMutator.AddFormDataElement(dataType.Id, data) is { } change)
            {
                created.Add(change);
            }
        }

        if (created.Count > 0)
        {
            // The elements are calculated here, as task start saves them without running the data write processors,
            // so the form loads with the values it would calculate itself
            var calculator = _serviceProvider.GetRequiredService<DataModelFieldCalculator>();
            await calculator.Calculate(instanceDataMutator, taskId, new DataElementChanges(created));
        }

        return new SuccessfulWorkflowEngineCommandResult();
    }
}
