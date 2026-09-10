using System.Text;
using System.Text.Json;
using Altinn.App.Ai.Enrichment.Agents;
using Altinn.App.Ai.Enrichment.Models;
using Altinn.App.Ai.Enrichment.Telemetry;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
#if NET10_0_OR_GREATER
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
#else
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
#endif
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
#if NET10_0_OR_GREATER
    IInstanceClient instanceClient,
#endif
    EnrichmentTrace trace,
    ILogger<AiServiceTask> logger) : IServiceTask
{
    public const string TaskType = "ai";

#if NET10_0_OR_GREATER
    /// <summary>
    /// Metadata key on output data elements naming the workflow that produced
    /// them. Used to detect replays: the engine delivers callbacks at least
    /// once, so a step whose success response was lost is re-run under the
    /// same workflow id — the marker lets us skip the (expensive,
    /// non-deterministic) agent re-run instead of storing duplicate outputs.
    /// </summary>
    internal const string WorkflowIdMetadataKey = "aiEnrichmentWorkflowId";

    /// <summary>
    /// Metadata key holding the Langfuse trace id for the run that produced the
    /// element. Traces are already findable by session id, but storing it on the
    /// instance closes the loop the other way: from a stored output back to the run
    /// that made it, which is what a caseworker's later verdict needs.
    /// </summary>
    internal const string LangfuseTraceIdMetadataKey = "langfuseTraceId";
#endif

    // Default serialization on purpose: null fields stay present as null, matching
    // plain JsonSerializer.Serialize(model) — the shape agent rules and mapper
    // specs are written against. Dropping nulls would silently change what the
    // path_value tool and mappers see.
    private static readonly JsonSerializerOptions ApplicationJsonOptions = JsonSerializerOptions.Default;

    public string Type => TaskType;

#if NET10_0_OR_GREATER
    /// <summary>
    /// Per-step execution budget for the workflow engine, from
    /// <see cref="AiEnrichmentOptions.Step"/>. Overrides the engine's 10-minute
    /// service-task default, which is too tight for long agent runs.
    /// </summary>
    public ProcessStepOptions? StepOptions
    {
        get
        {
            var step = options.Value.Step;
            return new ProcessStepOptions
            {
                MaxExecutionTime = step.MaxExecutionTime,
                RetryStrategy = step.MaxRetries == 0
                    ? ProcessStepRetryStrategy.None()
                    : ProcessStepRetryStrategy.Constant(step.RetryInterval, step.MaxRetries),
            };
        }
    }
#endif

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        var mutator = context.InstanceDataMutator;
        var taskId = mutator.Instance.Process?.CurrentTask?.ElementId
            ?? throw new InvalidOperationException("Instance has no current process task.");

        using var run = trace.StartRun($"ai-enrichment:{taskId}", System.Diagnostics.Activity.Current);

        try
        {
            var taskOptions = options.Value.ForTask(taskId);

#if NET10_0_OR_GREATER
            // At-least-once replay guard: if the engine lost this step's success
            // response, it re-runs the step under the same workflow id. The
            // previous attempt's outputs are already saved to storage (the
            // callback saves before responding), so re-running the agent would
            // both duplicate them and burn a full LLM run for a non-deterministic
            // result. Detect via the workflow-id marker and report success again.
            if (context.WorkflowId is { } workflowId
                && await HasOutputsFromWorkflow(mutator.Instance, taskOptions, workflowId, context.CancellationToken))
            {
                logger.LogWarning(
                    "ai task {TaskId}: outputs from workflow {WorkflowId} already stored on the instance; "
                        + "skipping agent re-run (replay of an attempt whose success response was lost)",
                    taskId, workflowId);

                // A replay is correct behaviour, not a failure, so it stays at default level
                // and simply carries no children — the session shows why a submission has
                // more than one trace without anyone having to cross-reference the engine.
                trace.DescribeRun(
                    run,
                    SessionId(mutator.Instance),
                    applicationJson: null,
                    RunMetadata(context, mutator.Instance, taskId, agentName: null, replay: true),
                    Tags(mutator.Instance, replay: true));
                trace.CompleteRun(run, $"skipped: outputs from workflow {workflowId} already stored");
                return ServiceTaskResult.Success();
            }
#endif

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

            trace.DescribeRun(
                run,
                SessionId(mutator.Instance),
                application.RootElement.GetRawText(),
                RunMetadata(context, mutator.Instance, taskId, runtime.Name, replay: false),
                Tags(mutator.Instance, replay: false));

            var result = await runtime.ExecuteAsync(application, context.CancellationToken);

            var traceId = run?.TraceId.ToHexString();

            foreach (var (key, value) in result.Context.Entries)
            {
                if (value is not string json)
                    continue;
                AddOutputElement(
                    context, taskOptions.JsonOutputDataType, "application/json", $"{key}.json",
                    Encoding.UTF8.GetBytes(json), traceId);
            }

            foreach (var file in result.Files)
                AddOutputElement(context, taskOptions.PdfOutputDataType, file.ContentType, file.Name, file.Data, traceId);

            trace.CompleteRun(run, DescribeOutput(result));
            return ServiceTaskResult.Success();
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
#if NET10_0_OR_GREATER
            // Config/contract errors won't heal on their own — fail permanently so the
            // engine does not re-run the whole (expensive) agent. Anything else may be
            // transient and gets the bounded retry strategy from StepOptions.
            if (ex is InvalidOperationException or FileNotFoundException or DirectoryNotFoundException)
            {
                logger.LogError(ex, "ai task {TaskId} failed permanently (configuration/contract error)", taskId);
                trace.CompleteRun(run, null, ex);
                return ServiceTaskResult.FailedPermanent(ex.Message);
            }

            logger.LogError(ex, "ai task {TaskId} failed; the workflow engine may retry the step", taskId);
            trace.CompleteRun(run, null, ex);
            return ServiceTaskResult.FailedRetryable(ex.Message);
#else
            logger.LogError(ex, "ai task {TaskId} failed; process halts on this task for retry", taskId);
            trace.CompleteRun(run, null, ex);
            return ServiceTaskResult.FailedAbortProcessNext();
#endif
        }
    }

    /// <summary>
    /// Stores an output element, tagged (on app-lib v9+) with the producing
    /// workflow id so replays of the same step can be detected.
    /// </summary>
    private static void AddOutputElement(
        ServiceTaskContext context,
        string dataTypeId,
        string contentType,
        string filename,
        ReadOnlyMemory<byte> bytes,
        string? langfuseTraceId)
    {
#if NET10_0_OR_GREATER
        List<KeyValueEntry>? metadata = null;
        if (context.WorkflowId is { } workflowId)
            (metadata ??= []).Add(new KeyValueEntry { Key = WorkflowIdMetadataKey, Value = workflowId.ToString() });
        if (!string.IsNullOrEmpty(langfuseTraceId))
            (metadata ??= []).Add(new KeyValueEntry { Key = LangfuseTraceIdMetadataKey, Value = langfuseTraceId });

        context.InstanceDataMutator.AddBinaryDataElement(dataTypeId, contentType, filename, bytes, metadata: metadata);
#else
        // Data-element metadata arrived with app-lib v9; on net8 the trace is still
        // findable by session id, which is the instance id.
        context.InstanceDataMutator.AddBinaryDataElement(dataTypeId, contentType, filename, bytes);
#endif
    }

#if NET10_0_OR_GREATER
    /// <summary>
    /// Checks whether an earlier attempt of the same workflow already stored
    /// outputs on the instance. The callback's restored state predates those
    /// saves, so the instance must be refetched from storage for the check.
    /// </summary>
    private async Task<bool> HasOutputsFromWorkflow(
        Instance instance,
        AiEnrichmentTaskOptions taskOptions,
        Guid workflowId,
        CancellationToken cancellationToken)
    {
        var fresh = await instanceClient.GetInstance(
            instance, StorageAuthenticationMethod.ServiceOwner(), cancellationToken);
        var marker = workflowId.ToString();
        return fresh.Data.Any(element =>
            (string.Equals(element.DataType, taskOptions.JsonOutputDataType, StringComparison.Ordinal)
                || string.Equals(element.DataType, taskOptions.PdfOutputDataType, StringComparison.Ordinal))
            && element.Metadata?.Any(entry => entry.Key == WorkflowIdMetadataKey && entry.Value == marker) == true);
    }
#endif

    /// <summary>
    /// Groups every trace for one submission: the first run, any workflow-engine
    /// retries, and any replays. Instance ids are already scoped by party, so this
    /// needs nothing else to be unique.
    /// </summary>
    private static string? SessionId(Instance instance) => instance.Id;

    private static IReadOnlyDictionary<string, object?> RunMetadata(
        ServiceTaskContext context,
        Instance instance,
        string taskId,
        string? agentName,
        bool replay)
    {
        var metadata = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["instance_id"] = instance.Id,
            ["app_id"] = instance.AppId,
            ["org"] = instance.Org,
            ["task_id"] = taskId,
        };

        if (agentName is not null)
            metadata["agent_name"] = agentName;
        if (replay)
            metadata["replay"] = true;

#if NET10_0_OR_GREATER
        // The engine's ids are what separate one attempt from another; without them a
        // retried submission is three indistinguishable traces in the same session.
        if (context.WorkflowId is { } workflowId)
            metadata["workflow_id"] = workflowId.ToString();
        if (context.StepId is { } stepId)
            metadata["step_id"] = stepId.ToString();
#endif

        return metadata;
    }

    private static IReadOnlyList<string> Tags(Instance instance, bool replay)
    {
        var tags = new List<string> { "altinn", "ai-enrichment" };
        if (!string.IsNullOrEmpty(instance.AppId))
            tags.Add(instance.AppId);
        if (replay)
            tags.Add("replay");
        return tags;
    }

    /// <summary>
    /// What the run produced, by shape rather than content — the outputs themselves are
    /// already stored on the instance, and a PDF has no business being in a trace.
    /// </summary>
    private static string DescribeOutput(EnrichmentResult result) =>
        JsonSerializer.Serialize(new
        {
            json = result.Context.Entries.Keys.OrderBy(k => k, StringComparer.Ordinal).ToArray(),
            files = result.Files.Select(f => new { name = f.Name, bytes = f.Data.Length }).ToArray(),
        });

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
