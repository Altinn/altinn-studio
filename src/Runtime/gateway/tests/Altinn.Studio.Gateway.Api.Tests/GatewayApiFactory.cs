using Altinn.Studio.Gateway.Api.Authentication;
using Altinn.Studio.Gateway.Api.Clients.WorkflowEngine;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// In-process gateway host for unit-level integration tests (no kind cluster needed).
/// <list type="bullet">
/// <item>Forces every request onto the public port so public endpoints and the auth pipeline run.</item>
/// <item>Validates fake-oidc tokens statically (no OIDC metadata fetch, no network).</item>
/// <item>Replaces the workflow engine HTTP handler with <see cref="EngineHandler"/>.</item>
/// <item>Captures log output in <see cref="Logs"/> for audit-line assertions.</item>
/// </list>
/// The service owner is deliberately configured with mixed casing to pin that the gateway
/// normalizes it when building the engine namespace.
/// </summary>
internal sealed class GatewayApiFactory : WebApplicationFactory<Program>
{
    public const string ConfiguredServiceOwner = "TTD";

    public FakeWorkflowEngineHandler EngineHandler { get; } = new();

    public CollectingLoggerProvider Logs { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration(
            (_, configuration) =>
                configuration.AddInMemoryCollection(
                    new Dictionary<string, string?> { ["Gateway:ServiceOwner"] = ConfiguredServiceOwner }
                )
        );

        builder.ConfigureLogging(logging => logging.AddProvider(Logs));

        builder.ConfigureTestServices(services =>
        {
            // Public endpoints are gated on Connection.LocalPort matching the public port, and
            // the auth middleware branch has the same condition. TestServer has no real
            // sockets, so stamp the public port onto every connection.
            services.AddSingleton<IStartupFilter>(new ForcePublicPortStartupFilter());

            // The issuer-scheme cache initializer fetches OIDC metadata over the network at
            // startup; remove it. The fallback scheme selection handles routing without it.
            foreach (
                var descriptor in services
                    .Where(d => d.ImplementationType == typeof(IssuerSchemeCacheInitializer))
                    .ToList()
            )
            {
                services.Remove(descriptor);
            }

            // Validate tokens against the fake-oidc signing key via a static configuration so
            // JwtBearer never fetches metadata. Applies to every Maskinporten scheme by name
            // convention, so the scheme count stays derived from the configured
            // MetadataAddresses instead of being duplicated here. The authorization policy
            // accepts a success from any scheme.
            services.AddSingleton<IPostConfigureOptions<JwtBearerOptions>, StaticFakeOidcConfiguration>();

            // Swap the upstream engine transport for the in-memory fake.
            services.Configure<HttpClientFactoryOptions>(
                WorkflowEngineClient.HttpClientName,
                options => options.HttpMessageHandlerBuilderActions.Add(b => b.PrimaryHandler = EngineHandler)
            );
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            EngineHandler.Dispose();
            Logs.Dispose();
        }
    }

    private sealed class StaticFakeOidcConfiguration : IPostConfigureOptions<JwtBearerOptions>
    {
        private static readonly JsonWebKey _signingKey = new(
            File.ReadAllText(FakeMaskinportenTokenGenerator.PrivateKeyPath)
        );

        public void PostConfigure(string? name, JwtBearerOptions options)
        {
            if (
                name is null
                || !name.StartsWith(MaskinportenAuthenticationExtensions.SchemeNamePrefix, StringComparison.Ordinal)
            )
                return;

            var configuration = new OpenIdConnectConfiguration { Issuer = FakeMaskinportenTokenGenerator.Issuer };
            configuration.SigningKeys.Add(_signingKey);
            options.ConfigurationManager = new StaticConfigurationManager<OpenIdConnectConfiguration>(configuration);
        }
    }

    private sealed class ForcePublicPortStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) =>
            app =>
            {
                app.Use(
                    (context, nextMiddleware) =>
                    {
                        context.Connection.LocalPort = Altinn.Studio.Gateway.Api.Hosting.PortConfiguration.PublicPort;
                        return nextMiddleware(context);
                    }
                );
                next(app);
            };
    }
}
