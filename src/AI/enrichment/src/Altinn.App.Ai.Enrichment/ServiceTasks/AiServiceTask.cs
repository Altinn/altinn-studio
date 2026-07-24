using System.Text;
using System.Text.Json;
using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Ai.Enrichment.ServiceTasks;

/// <summary>
/// The <c>ai</c> process step. When the process engine enters a
/// <c>&lt;bpmn:serviceTask&gt;</c> with <c>&lt;altinn:taskType&gt;ai&lt;/altinn:taskType&gt;</c>,
/// this task loads the agent folder mapped to the task id (default:
/// <c>App/agents/&lt;taskId&gt;/</c>), runs the agent over the instance's form
/// data, and stores the results on the instance: every published JSON entry as
/// an <c>application/json</c> data element and every rendered PDF as a binary
/// data element. The engine saves the mutations and auto-advances on success;
/// on failure the process halts on this task and the next <c>process/next</c>
/// retries.
/// </summary>
public sealed class AiServiceTask(
    AgentRuntimeFactory agentRuntimeFactory,
    IOptions<AiEnrichmentOptions> options,
    IOptions<AppSettings> appSettings,
    ILogger<AiServiceTask> logger) : IServiceTask
{
    public const string TaskType = "ai";

    // Default serialization on purpose: null fields stay present as null, matching
    // plain JsonSerializer.Serialize(model) — the shape agent rules and mapper
    // specs are written against. Dropping nulls would silently change what the
    // path_value tool and mappers see.
    private static readonly JsonSerializerOptions ApplicationJsonOptions = JsonSerializerOptions.Default;

    public string Type => TaskType;

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        var mutator = context.InstanceDataMutator;
        var taskId = mutator.Instance.Process?.CurrentTask?.ElementId
            ?? throw new InvalidOperationException("Instance has no current process task.");

        try
        {
            var taskOptions = options.Value.ForTask(taskId);
            var agentFolderPath = ResolveAgentFolderPath(taskId, taskOptions);
            var runtime = agentRuntimeFactory.GetOrCreate(agentFolderPath);

            var inputElement = ResolveInputDataElement(mutator, taskOptions.InputDataType, taskId);
            var model = await mutator.GetFormData(inputElement);
            // EnrichmentData.Parse unwraps models whose root is a FlatData
            // envelope (common in apps generated from flat XSDs) so agent rules
            // and mappers see the same paths regardless of that wrapper.
            using var application = EnrichmentData.Parse(
                JsonSerializer.SerializeToUtf8Bytes(model, ApplicationJsonOptions));

            logger.LogInformation(
                "ai task {TaskId}: running agent '{AgentName}' over data element {DataElementId} ({DataType})",
                taskId, runtime.Name, inputElement.Id, inputElement.DataType);

            var result = await runtime.ExecuteAsync(application, context.CancellationToken);

            foreach (var (key, value) in result.Context.Entries)
            {
                if (value is not string json)
                    continue;
                mutator.AddBinaryDataElement(
                    taskOptions.JsonOutputDataType, "application/json", $"{key}.json", Encoding.UTF8.GetBytes(json));
            }

            foreach (var file in result.Files)
                mutator.AddBinaryDataElement(taskOptions.PdfOutputDataType, file.ContentType, file.Name, file.Data);

            return ServiceTaskResult.Success();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "ai task {TaskId} failed; process halts on this task for retry", taskId);
            return ServiceTaskResult.FailedAbortProcessNext();
        }
    }

    private string ResolveAgentFolderPath(string taskId, AiEnrichmentTaskOptions taskOptions)
    {
        var agentName = string.IsNullOrWhiteSpace(taskOptions.Agent) ? taskId : taskOptions.Agent;
        return Path.Combine(appSettings.Value.AppBasePath, options.Value.AgentsRoot, agentName);
    }

    /// <summary>
    /// Picks the form-data element the agent evaluates. With an explicit
    /// <c>InputDataType</c> the choice must be unambiguous on the instance;
    /// without one, the instance must carry exactly one data element whose
    /// data type has appLogic (a C# form model).
    /// </summary>
    internal static DataElement ResolveInputDataElement(
        IInstanceDataAccessor accessor,
        string? configuredDataType,
        string taskId)
    {
        List<DataElement> candidates;
        if (!string.IsNullOrWhiteSpace(configuredDataType))
        {
            candidates = accessor.Instance.Data
                .Where(d => string.Equals(d.DataType, configuredDataType, StringComparison.Ordinal))
                .ToList();
            if (candidates.Count == 0)
                throw new InvalidOperationException(
                    $"ai task '{taskId}': no data element of type '{configuredDataType}' on the instance.");
        }
        else
        {
            candidates = accessor.Instance.Data
                .Where(d => accessor.GetDataType(d.DataType).AppLogic?.ClassRef is not null)
                .ToList();
            if (candidates.Count == 0)
                throw new InvalidOperationException(
                    $"ai task '{taskId}': the instance has no form-data element (data type with appLogic).");
        }

        if (candidates.Count > 1)
        {
            throw new InvalidOperationException(
                $"ai task '{taskId}': ambiguous input — {candidates.Count} candidate data elements " +
                $"({string.Join(", ", candidates.Select(c => c.DataType))}). " +
                $"Set {AiEnrichmentOptions.SectionName}:Tasks:{taskId}:InputDataType.");
        }

        return candidates[0];
    }
}
