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

        var pathOperations = document.Paths.Values.SelectMany(x =>
            x.Operations?.Values ?? Enumerable.Empty<OpenApiOperation>()
        );

        foreach (var operation in pathOperations)
        {
            if (operation.Tags?.Select(x => x.Name).Contains(ApiKeyAuthenticationHandler.SchemeName) is false)
                continue;

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
