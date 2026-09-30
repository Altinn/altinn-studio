using Altinn.App.Api.Controllers;
using Altinn.App.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Altinn.App.Api.Extensions;

internal static class SwaggerFilterExtensions
{
    /// <summary>
    /// Adds filters that customize the generated Swagger documentation.
    /// </summary>
    /// <param name="services"></param>
    public static void AddSwaggerFilter(this IServiceCollection services)
    {
        services.Configure<SwaggerGenOptions>(c =>
        {
            c.DocumentFilter<DocumentFilter>();
            c.OperationFilter<ExplicitProblemDetailsResponseOperationFilter>();
            c.OperationFilter<ActionsPerformConflictResponseOperationFilter>();
            c.OperationFilter<ProcessStartConflictResponseOperationFilter>();
            c.OperationFilter<ProcessCompleteConflictResponseOperationFilter>();
        });
    }
}

internal sealed class ExplicitProblemDetailsResponseOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var responseMetadata = context
            .ApiDescription.ActionDescriptor.EndpointMetadata.OfType<ProducesResponseTypeAttribute>()
            .Select(metadata => (Metadata: metadata, ContentTypes: GetContentTypes(metadata)))
            .SingleOrDefault(response =>
                response.Metadata.StatusCode == StatusCodes.Status409Conflict
                && response.ContentTypes.Contains(ProcessStatusProblemResult.ContentType)
            );
        if (
            responseMetadata.Metadata is null
            || operation.Responses is null
            || !operation.Responses.TryGetValue(
                responseMetadata.Metadata.StatusCode.ToString(System.Globalization.CultureInfo.InvariantCulture),
                out var response
            )
        )
        {
            return;
        }

        Type responseType =
            responseMetadata.Metadata.Type
            ?? throw new InvalidOperationException("Explicit ProblemDetails response metadata has no response type.");
        var schema = context.SchemaGenerator.GenerateSchema(responseType, context.SchemaRepository);
        var content =
            response.Content ?? throw new InvalidOperationException("Explicit ProblemDetails response has no content.");
        content.Clear();
        foreach (string contentType in responseMetadata.ContentTypes)
        {
            content[contentType] = new() { Schema = schema };
        }
    }

    private static MediaTypeCollection GetContentTypes(IApiResponseMetadataProvider metadata)
    {
        var contentTypes = new MediaTypeCollection();
        metadata.SetContentTypes(contentTypes);
        return contentTypes;
    }
}

internal sealed class ActionsPerformConflictResponseOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (
            context.MethodInfo.DeclaringType != typeof(ActionsController)
            || context.MethodInfo.Name != nameof(ActionsController.Perform)
            || operation.Responses is null
            || !operation.Responses.TryGetValue("409", out var conflictResponse)
        )
        {
            return;
        }

        var userActionResponseSchema = context.SchemaGenerator.GenerateSchema(
            typeof(UserActionResponse),
            context.SchemaRepository
        );
        var problemDetailsSchema = context.SchemaGenerator.GenerateSchema(
            typeof(ProblemDetails),
            context.SchemaRepository
        );
        var jsonResponseSchema = new OpenApiSchema { OneOf = [userActionResponseSchema, problemDetailsSchema] };

        var content =
            conflictResponse.Content
            ?? throw new InvalidOperationException("Actions.Perform 409 response has no content.");
        content.Clear();
        content["text/plain"] = new() { Schema = new OpenApiSchema { Type = JsonSchemaType.String } };
        content["application/problem+json"] = new() { Schema = problemDetailsSchema };
        content["application/json"] = new() { Schema = jsonResponseSchema };
        content["text/json"] = new() { Schema = jsonResponseSchema };
    }
}

internal sealed class ProcessStartConflictResponseOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (
            context.MethodInfo.DeclaringType != typeof(ProcessController)
            || context.MethodInfo.Name != nameof(ProcessController.StartProcess)
            || operation.Responses is null
            || !operation.Responses.TryGetValue("409", out var conflictResponse)
        )
        {
            return;
        }

        var problemDetailsSchema = context.SchemaGenerator.GenerateSchema(
            typeof(ProblemDetails),
            context.SchemaRepository
        );
        var jsonResponseSchema = new OpenApiSchema
        {
            OneOf = [new OpenApiSchema { Type = JsonSchemaType.String }, problemDetailsSchema],
        };
        var content =
            conflictResponse.Content
            ?? throw new InvalidOperationException("ProcessController.StartProcess 409 response has no content.");
        content.Clear();
        content["text/plain"] = new() { Schema = new OpenApiSchema { Type = JsonSchemaType.String } };
        content["application/problem+json"] = new() { Schema = problemDetailsSchema };
        content["application/json"] = new() { Schema = jsonResponseSchema };
        content["text/json"] = new() { Schema = jsonResponseSchema };
    }
}

internal sealed class ProcessCompleteConflictResponseOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (
            context.MethodInfo.DeclaringType != typeof(ProcessController)
            || context.MethodInfo.Name != nameof(ProcessController.CompleteProcess)
            || operation.Responses is null
            || !operation.Responses.TryGetValue("409", out var conflictResponse)
        )
        {
            return;
        }

        var problemDetailsSchema = context.SchemaGenerator.GenerateSchema(
            typeof(ProblemDetails),
            context.SchemaRepository
        );
        var jsonResponseSchema = new OpenApiSchema
        {
            OneOf = [new OpenApiSchema { Type = JsonSchemaType.String }, problemDetailsSchema],
        };
        var content =
            conflictResponse.Content
            ?? throw new InvalidOperationException("ProcessController.CompleteProcess 409 response has no content.");
        content.Clear();
        content["text/plain"] = new() { Schema = new OpenApiSchema { Type = JsonSchemaType.String } };
        content["application/problem+json"] = new() { Schema = problemDetailsSchema };
        content["application/json"] = new() { Schema = jsonResponseSchema };
        content["text/json"] = new() { Schema = jsonResponseSchema };
    }
}

internal class DocumentFilter : IDocumentFilter
{
    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        swaggerDoc.Info.Description = CustomOpenApiController.InfoDescriptionWarningText;
        // Remove path from swagger that is used only for backwards compatibility.
        swaggerDoc.Paths.Remove("/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataType}");

        swaggerDoc.Paths.Remove(
            "/{org}/{app}/instances/{instanceOwnerPartyId}/{instanceGuid}/data/{dataGuid}/type/{dataType}"
        );
    }
}
