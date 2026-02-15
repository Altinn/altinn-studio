using System.Globalization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace WorkflowEngine.Api.Authentication.ApiKey;

internal sealed class ApiKeyOpenApiTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken
    )
    {
        var securityScheme = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.ApiKey,
            Name = ApiKeyAuthenticationHandler.HeaderName,
            In = ParameterLocation.Header,
            Description = "API key authentication",
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[ApiKeyAuthenticationHandler.SchemeName] = securityScheme;

        // NOTE: This assumes that all 401-capable endpoints require API key authentication. Not ideal, but works for now.
        var pathOperations = document.Paths.Values.SelectMany(x =>
            x.Operations?.Values ?? Enumerable.Empty<OpenApiOperation>()
        );
        var pathOperationsRequiringAuth = pathOperations.Where(operation =>
            operation
                .Responses?.Select(x => x.Key)
                .Contains(StatusCodes.Status401Unauthorized.ToString(CultureInfo.InvariantCulture))
                is true
        );

        foreach (var operation in pathOperationsRequiringAuth)
        {
            operation.Security ??= [];
            operation.Security.Add(
                new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference(ApiKeyAuthenticationHandler.SchemeName, document)] = [],
                }
            );
        }

        return Task.CompletedTask;
    }
}
