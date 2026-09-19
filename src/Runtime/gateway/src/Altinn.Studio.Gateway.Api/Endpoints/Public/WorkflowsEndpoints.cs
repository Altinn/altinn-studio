using Altinn.Studio.Gateway.Api.Application;

namespace Altinn.Studio.Gateway.Api.Endpoints.Public;

/// <summary>
/// Whitelisted pass-through to the workflow engine for Studio's admin surface. Exactly these
/// six routes are exposed — the rest of the engine's surface (enqueue, cancel, nudge,
/// dependency graphs, namespaces, dashboard) stays unreachable through the gateway.
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
                    + "label (repeatable, key:value), isHead. Engine response is passed through unmodified."
            );

        workflowsApi
            .MapGet("/workflows/{workflowId:guid}", HandleWorkflows.GetWorkflow)
            .WithName("GetWorkflow")
            .WithSummary("Get a workflow by id.")
            .WithDescription("Single workflow with all steps. Engine response is passed through unmodified.");

        workflowsApi
            .MapPost("/workflows/{workflowId:guid}/resume", HandleWorkflows.ResumeWorkflow)
            .WithName("ResumeWorkflow")
            .WithSummary("Resume a terminal workflow.")
            .WithDescription(
                "Resumes a terminal workflow back to Enqueued for re-processing; pass cascade=true to also "
                    + "resume workflows left in DependencyFailed by this one. Audited. Engine response is passed through unmodified."
            );

        workflowsApi
            .MapPost("/workflows/{workflowId:guid}/abandon", HandleWorkflows.AbandonWorkflow)
            .WithName("AbandonWorkflow")
            .WithSummary("Abandon an unsuccessful terminal workflow.")
            .WithDescription(
                "Writes off an unsuccessful terminal workflow so it no longer condemns dependents. "
                    + "Audited. Engine response is passed through unmodified."
            );

        return publicApiV1;
    }
}
