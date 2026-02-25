using Altinn.Studio.Runtime.Common;
using Altinn.Studio.Gateway.Api;
using Altinn.Studio.Gateway.Api.Authentication;
using Altinn.Studio.Gateway.Api.Hosting;
using HostPortScope = Altinn.Studio.Gateway.Api.Hosting.PortScope;
using HostPortScopeMetadata = Altinn.Studio.Gateway.Api.Hosting.PortScopeMetadata;

var builder = WebApplication.CreateSlimBuilder(args);
builder.AddGateway();
builder.ConfigureKestrelPorts(publicPort: PortConfiguration.PublicPort, internalPort: PortConfiguration.InternalPort);
builder.UseCommonHostingConfiguration();
builder.AddMaskinportenAuthentication();
builder.AddOpenTelemetry();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi(
    "public-v1",
    options =>
    {
        options.ShouldInclude = (description) =>
        {
            var scope = description.ActionDescriptor.EndpointMetadata.OfType<HostPortScopeMetadata>().FirstOrDefault();
            return scope?.Scope != HostPortScope.Internal;
        };
    }
);
builder.Services.AddOpenApi(
    "internal-v1",
    options =>
    {
        options.ShouldInclude = (description) =>
        {
            var scope = description.ActionDescriptor.EndpointMetadata.OfType<HostPortScopeMetadata>().FirstOrDefault();
            return scope?.Scope != HostPortScope.Public;
        };
    }
);

var app = builder.Build();

app.UseHsts();
app.UseForwardedHeaders();

// Only run auth middleware on public port - internal port is secured by NetworkPolicy
app.UseWhen(
    ctx => ctx.Connection.LocalPort == PortConfiguration.PublicPort,
    branch =>
    {
        branch.UseAuthentication();
        branch.UseAuthorization();
    }
);

app.MapOpenApi();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/public-v1.json", "Public API v1");
    options.SwaggerEndpoint("/openapi/internal-v1.json", "Internal API v1");
});

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.UseGateway();

await app.RunAsync();
