using Altinn.Studio.Gateway.Api.Application;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

/// <summary>
/// Whitelisted pass-through to the workflow engine for Studio's admin surface. Exactly these
/// seven routes are exposed — the rest of the engine's surface (enqueue, cancel, abandon,
/// dependency graphs, namespaces, throttling, mailboxes, dashboard) stays unreachable through
/// the gateway. Abandon (writing a failure off) is deliberately left out for now: Studio offers
/// no write-off verb until its consequences for the instance are settled.
/// </summary>
internal static class WorkflowsEndpoints
{
    public static RouteGroupBuilder MapWorkflowsEndpoints(this RouteGroupBuilder publicApiV1)
    {
        var workflowsApi = publicApiV1
            .MapGroup("/workflows/apps/{app}")
            .RequireAuthorization("MaskinportenScope")
            .WithTags("Workflows");

        workflowsApi
            .MapGet("/collections", HandleWorkflows.ListCollections)
            .WithName("ListWorkflowCollections")
            .WithSummary("List workflow collections for an app.")
            .WithDescription(
                "Per-collection health view from the workflow engine. Three mutually exclusive modes: "
                    + "list (cursor, pageSize), annotate (key, repeatable — reports unmatchedKeys), and "
                    + "discover (failures=any|visible|invisible). Engine response is passed through unmodified."
            );

        workflowsApi
            .MapGet("/collections/{key}", HandleWorkflows.GetCollection)
            .WithName("GetWorkflowCollection")
            .WithSummary("Get a workflow collection by key.")
            .WithDescription(
                "Single collection with head workflow statuses (frontier view). Engine response is passed through unmodified."
            );

        workflowsApi
            .MapGet("/workflows", HandleWorkflows.ListWorkflows)
            .WithName("ListWorkflows")
            .WithSummary("List workflows for an app.")
            .WithDescription(
                "Cursor-paginated workflow list. Optional filters: collectionKey, status (repeatable), "
                    + "label (repeatable, key:value), isHead; includeState=false leaves the app's state payload off. "
                    + "Engine response is passed through unmodified."
            );

        workflowsApi
            .MapGet("/workflows/{workflowId:guid}", HandleWorkflows.GetWorkflow)
            .WithName("GetWorkflow")
            .WithSummary("Get a workflow by id.")
            .WithDescription(
                "Single workflow with all steps; includeState=false leaves the app's state payload off. "
                    + "Engine response is passed through unmodified."
            );

        workflowsApi
            .MapPost("/workflows/{workflowId:guid}/resume", HandleWorkflows.ResumeWorkflow)
            .WithName("ResumeWorkflow")
            .WithSummary("Resume a terminal workflow.")
            .WithDescription(
                "Resumes a terminal workflow back to Enqueued for re-processing; pass cascade=true to also "
                    + "resume workflows left in DependencyFailed by this one. Audited. Engine response is passed through unmodified."
            );

        workflowsApi
            .MapPost("/workflows/{workflowId:guid}/nudge", HandleWorkflows.NudgeWorkflow)
            .WithName("NudgeWorkflow")
            .WithSummary("Run a parked workflow now.")
            .WithDescription(
                "Clears a parked (Requeued/Waiting) workflow's pending backoff so the engine re-executes it on "
                    + "its next fetch instead of when the timer elapses. Audited. Engine response is passed through unmodified."
            );

        workflowsApi
            .MapPost("/workflows/{workflowId:guid}/fail", HandleWorkflows.FailWorkflow)
            .WithName("FailWorkflow")
            .WithSummary("Give up on a parked workflow.")
            .WithDescription(
                "Fails a parked (Requeued/Waiting) workflow by caller decision instead of waiting its retries out. "
                    + "The optional body's reason (at most 500 characters) is recorded as the parked step's final "
                    + "error entry; nothing else in the body is forwarded. Audited. Engine response is passed through unmodified."
            );

        return publicApiV1;
    }
}
