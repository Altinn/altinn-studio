using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using WorkflowEngine.Models;

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
        ["ListCollections"] = "list-collections",
        ["GetCollection"] = "get-collection",
    };

    private static readonly Dictionary<string, string> _listWorkflowParamDescriptions = new()
    {
        ["status"] =
            "Filter by workflow status (repeatable, case-insensitive). Omit to return all statuses; an unrecognized value returns 400.",
        ["label"] = "Filter by label, formatted as key:value (repeatable). Entries without a colon are ignored.",
        ["collectionKey"] = "Filter to a single workflow collection.",
        ["cursor"] = "Pagination cursor — pass the nextCursor from the previous response to fetch the next page.",
        ["pageSize"] = "Items per page (default 25, clamped to 1–100).",
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
                                .. Enum.GetNames<PersistentItemStatus>()
                                    .Select(name => (JsonNode)JsonValue.Create(name)!),
                            ],
                        },
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
