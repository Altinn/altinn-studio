using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using WorkflowEngine.Models;

// Urls should not be hard-coded
#pragma warning disable S1075

namespace WorkflowEngine.Core.Metadata;

/// <summary>
/// Stable links into the engine's technical guide, used to point Swagger users at the
/// deeper behavioral documentation without duplicating it in operation descriptions.
/// </summary>
internal static class EngineApiDocs
{
    public const string TechnicalGuideUrl =
        "https://github.com/Altinn/altinn-studio/blob/main/src/Runtime/workflow-engine/docs/technical-guide.md";
}

/// <summary>
/// Enriches the generated OpenAPI document with information the built-in generator cannot infer:
/// the valid values for the <c>status</c> query filter (enum-array query params render without an
/// item schema), human-friendly query-parameter descriptions, and per-operation links into the
/// technical guide.
/// </summary>
internal sealed class EngineApiDocsOperationTransformer : IOpenApiOperationTransformer
{
    /// <summary>Per-operation deep links into the technical guide (operationId → heading anchor).</summary>
    private static readonly Dictionary<string, string> _operationDocAnchors = new()
    {
        ["ListNamespaces"] = "api-reference",
        ["EnqueueWorkflows"] = "enqueue-workflows",
        ["ListWorkflows"] = "list-workflows",
        ["GetWorkflow"] = "get-single-workflow",
        ["GetWorkflowDependencyGraph"] = "dependency-graphs",
        ["CancelWorkflow"] = "immediate-vs-distributed-cancellation",
        ["ResumeWorkflow"] = "resume",
        ["AbandonWorkflow"] = "abandon",
        ["NudgeWorkflow"] = "nudge",
        ["ListCollections"] = "list-collections",
        ["GetCollection"] = "get-collection",
        ["MintMailbox"] = "mint-mailbox",
        ["GetMailbox"] = "get-mailbox",
        ["CloseMailbox"] = "close-mailbox",
        ["DeliverToMailbox"] = "deliver-to-mailbox",
    };

    private static readonly Dictionary<string, string> _listWorkflowParamDescriptions = new()
    {
        ["status"] =
            "Filter by workflow status (repeatable, case-insensitive). Omit to return all statuses; an unrecognized value returns 400.",
        ["label"] = "Filter by label, formatted as key:value (repeatable). Entries without a colon are ignored.",
        ["collectionKey"] = "Filter to a single workflow collection.",
        ["isHead"] =
            "Filter by head visibility. Deliberately asymmetric with the response field of the same name: "
            + "the field is the raw enqueue directive (true, false, or absent), while this parameter is effective "
            + "visibility — isHead=true matches every workflow the head frontier can see (directive true OR unset, "
            + "so it returns rows whose isHead field reads null), and isHead=false matches exactly the invisible "
            + "ones (directive false). Omit to return both.",
        ["cursor"] = "Pagination cursor — pass the nextCursor from the previous response to fetch the next page.",
        ["pageSize"] = "Items per page (default 25, clamped to 1–100).",
    };

    private static readonly Dictionary<string, string> _listCollectionParamDescriptions = new()
    {
        ["key"] =
            "Annotate mode: report health for these collection keys (repeatable; duplicates are deduplicated). "
            + "Mutually exclusive with cursor and failures (400). Requests with more distinct keys than the maximum "
            + "page size are rejected with 400, never truncated. Keys without a collection row are reported in "
            + "unmatchedKeys.",
        ["failures"] =
            "Discover mode: only collections containing at least one failed workflow (Failed, Canceled, "
            + "DependencyFailed; Abandoned never matches). 'visible' restricts to failures the head frontier can "
            + "see (isHead directive not false), 'invisible' to failures of workflows enqueued with isHead=false, "
            + "'any' ignores visibility. An unrecognized value returns 400.",
        ["cursor"] =
            "Pagination cursor — pass the nextCursor from the previous response to fetch the next page. "
            + "Not valid together with key.",
        ["pageSize"] = "Items per page (default 25, clamped to 1–100). Ignored in annotate (key) mode.",
    };

    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken
    )
    {
        var operationId = operation.OperationId;
        if (operationId is null)
            return Task.CompletedTask;

        if (_operationDocAnchors.TryGetValue(operationId, out var anchor))
        {
            operation.ExternalDocs = new OpenApiExternalDocs
            {
                Description = "Full behavior in the technical guide",
                Url = new Uri($"{EngineApiDocs.TechnicalGuideUrl}#{anchor}"),
            };
        }

        if (operationId == "ListWorkflows" && operation.Parameters is not null)
        {
            foreach (var parameter in operation.Parameters.OfType<OpenApiParameter>())
            {
                if (parameter.Name is { } name && _listWorkflowParamDescriptions.TryGetValue(name, out var description))
                    parameter.Description = description;

                if (parameter.Name == "status")
                {
                    parameter.Schema = new OpenApiSchema
                    {
                        Type = JsonSchemaType.Array,
                        Items = new OpenApiSchema
                        {
                            Type = JsonSchemaType.String,
                            Enum =
                            [
                                .. Enum.GetNames<PersistentItemStatus>().Select(JsonNode (x) => JsonValue.Create(x)),
                            ],
                        },
                    };
                }
            }
        }

        if (operationId == "ListCollections" && operation.Parameters is not null)
        {
            foreach (var parameter in operation.Parameters.OfType<OpenApiParameter>())
            {
                if (
                    parameter.Name is { } name
                    && _listCollectionParamDescriptions.TryGetValue(name, out var description)
                )
                    parameter.Description = description;

                if (parameter.Name == "failures")
                {
                    parameter.Schema = new OpenApiSchema
                    {
                        Type = JsonSchemaType.String,
                        Enum =
                        [
                            .. Enum.GetNames<CollectionFailureFilter>().Select(JsonNode (x) => JsonValue.Create(x)),
                        ],
                    };
                }
            }
        }

        return Task.CompletedTask;
    }
}

/// <summary>
/// Adds a document-level link to the engine's technical guide, surfaced by Swagger UI near the title.
/// </summary>
internal sealed class EngineApiDocsDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken
    )
    {
        document.ExternalDocs = new OpenApiExternalDocs
        {
            Description = "Workflow Engine technical guide",
            Url = new Uri(EngineApiDocs.TechnicalGuideUrl),
        };

        return Task.CompletedTask;
    }
}
