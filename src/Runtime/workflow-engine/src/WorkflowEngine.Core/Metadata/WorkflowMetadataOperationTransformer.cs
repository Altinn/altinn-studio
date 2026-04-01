using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Metadata;

/// <summary>
/// Adds OpenAPI parameter definitions for workflow metadata headers/query params
/// that are extracted manually by <see cref="Metadata.MetadataExtractor"/> and therefore
/// not visible to the built-in OpenAPI generator.
/// </summary>
internal sealed class WorkflowMetadataOperationTransformer : IOpenApiOperationTransformer
{
    private static readonly HashSet<string> _enqueueOperations = ["EnqueueWorkflows"];

    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken
    )
    {
        var operationId = operation.OperationId;
        if (operationId is null)
            return Task.CompletedTask;

        if (_enqueueOperations.Contains(operationId))
        {
            AddIdempotencyKeyParameter(operation);
            AddCorrelationIdParameter(operation);
        }

        return Task.CompletedTask;
    }

    private static void AddIdempotencyKeyParameter(OpenApiOperation operation)
    {
        operation.Parameters ??= [];
        operation.Parameters.Add(
            new OpenApiParameter
            {
                Name = WorkflowMetadataConstants.Headers.IdempotencyKey,
                In = ParameterLocation.Header,
                Required = true,
                Description =
                    $"Idempotency key for the enqueue request. Can also be supplied as query parameter '{WorkflowMetadataConstants.QueryParams.IdempotencyKey}'. "
                    + "Must not be supplied as both header and query parameter.",
                Schema = new OpenApiSchema { Type = JsonSchemaType.String },
            }
        );
    }

    private static void AddCorrelationIdParameter(OpenApiOperation operation)
    {
        operation.Parameters ??= [];
        operation.Parameters.Add(
            new OpenApiParameter
            {
                Name = WorkflowMetadataConstants.Headers.CorrelationId,
                In = ParameterLocation.Header,
                Required = false,
                Description =
                    $"Correlation ID (GUID) to group related workflows. Can also be supplied as query parameter '{WorkflowMetadataConstants.QueryParams.CorrelationId}'. "
                    + "Must not be supplied as both header and query parameter.",
                Schema = new OpenApiSchema { Type = JsonSchemaType.String, Format = "uuid" },
            }
        );
    }
}
