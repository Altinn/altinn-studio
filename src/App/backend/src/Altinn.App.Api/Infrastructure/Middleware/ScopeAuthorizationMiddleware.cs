using System.Collections.Frozen;
using System.Text;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Cache;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Infrastructure.Middleware;

internal static class ScopeAuthorizationDI
{
    /// <summary>
    /// Adds scope authorization services and middleware to the service collection.
    /// This works with both MVC controllers and minimal APIs.
    /// </summary>
    internal static IServiceCollection AddScopeAuthorization(this IServiceCollection services)
    {
        services.AddSingleton<ScopeAuthorizationService>();
        services.AddHostedService<ScopeAuthorizationService>(sp => sp.GetRequiredService<ScopeAuthorizationService>());
        return services;
    }

    internal static IApplicationBuilder UseScopeAuthorization(this IApplicationBuilder app)
    {
        app.UseMiddleware<ScopeAuthorizationMiddleware>();
        return app;
    }
}

internal sealed class ScopeRequirementMetadata()
{
    public string? ErrorMessageTextResourceKeyUser { get; internal set; }
    public string? ErrorMessageTextResourceKeyServiceOwner { get; internal set; }
    public FrozenSet<string>? RequiredScopesUsers { get; internal set; }
    public FrozenSet<string>? RequiredScopesServiceOwners { get; internal set; }
}

internal sealed class ScopeAuthorizationMiddleware(RequestDelegate _next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var user = context.User;
        var isAuth = user.Identity?.IsAuthenticated ?? false;

        if (isAuth)
        {
            var authorizer = context.RequestServices.GetRequiredService<ScopeAuthorizationService>();
            await authorizer.EnsureInitialized();

            if (!authorizer.HasDefinedCustomScopes)
            {
                await _next(context);
                return;
            }

            var telemetry = context.RequestServices.GetService<Core.Features.Telemetry>();
            using var activity = telemetry?.StartScopeAuthorizationActivity();
            var logger = context.RequestServices.GetRequiredService<ILogger<ScopeAuthorizationMiddleware>>();
            var endpointObj = context.GetEndpoint();
            if (endpointObj is not RouteEndpoint routeEndpoint)
            {
                logger.LogError("Invalid endpoint type: {EndpointType}", endpointObj?.GetType().FullName);
                await _next(context);
                return;
            }

            var apiEndpoint = new ApiEndpoint(routeEndpoint, context.Request.Method);

            // Get scopes from endpoint metadata
            var scopeMetadata = authorizer.LookupMetadata(apiEndpoint);
            var authenticated = context.RequestServices.GetRequiredService<IAuthenticationContext>().Current;
            var (errorMessageTextResourceKey, requiredScopes) = authenticated switch
            {
                Authenticated.User or Authenticated.SystemUser or Authenticated.Org => (
                    scopeMetadata?.ErrorMessageTextResourceKeyUser,
                    scopeMetadata?.RequiredScopesUsers
                ),
                Authenticated.ServiceOwner => (
                    scopeMetadata?.ErrorMessageTextResourceKeyServiceOwner,
                    scopeMetadata?.RequiredScopesServiceOwners
                ),
                _ => (null, null),
            };
            if (requiredScopes is not null)
            {
                var scopeClaim = user.FindFirst("urn:altinn:scope") ?? user.FindFirst("scope");
                var scopes = new Scopes(scopeClaim?.Value);
                if (!HasAnyScope(in scopes, requiredScopes))
                {
                    var lang = await authenticated.GetLanguage();
                    var translationService = context.RequestServices.GetRequiredService<ITranslationService>();
                    var errorMessage =
                        await translationService.TranslateTextKeyLenient(errorMessageTextResourceKey, lang)
                        ?? "Insufficient scope";

                    logger.LogWarning("User does not have required scope for endpoint '{Endpoint}'", apiEndpoint);

                    context.Response.StatusCode = 403;
                    await context.Response.WriteAsJsonAsync(
                        new ProblemDetails
                        {
                            Title = "Forbidden",
                            Status = 403,
                            Detail = errorMessage,
                            Instance = context.Request.Path,
                        },
                        context.RequestAborted
                    );
                    return;
                }
                else
                {
                    logger.LogDebug("User has required scope for endpoint '{Endpoint}'", apiEndpoint);
                }
            }
        }

        await _next(context);
    }

    private static bool HasAnyScope(in Scopes scopes, FrozenSet<string> requiredScopes)
    {
        // TODO: alternate lookup to avoid alloc???? Not available in net8.0
        foreach (var scope in scopes)
        {
            if (requiredScopes.Contains(scope.ToString()))
            {
                return true;
            }
        }

        return false;
    }
}

internal sealed class ScopeAuthorizationService(
    IAppConfigurationCache _appConfigurationCache,
    IEnumerable<EndpointDataSource> _endpointDataSources,
    IHostApplicationLifetime _hostLifetime,
    IOptions<GeneralSettings> _generalSettings,
    ILogger<ScopeAuthorizationService> _logger,
    Core.Features.Telemetry? _telemetry = null
) : IHostedService
{
    private readonly TaskCompletionSource _initialization = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private long _initializing;
    private CancellationTokenRegistration? _startedListener;

    private readonly FrozenSet<string> _readHttpMethods = new[] { "GET", "HEAD", "OPTIONS" }.ToFrozenSet(
        StringComparer.OrdinalIgnoreCase
    );

    private enum ScopeType
    {
        Read,
        Write,
    }

    private readonly FrozenDictionary<string, ScopeType> _manuallyIncludeActions = new Dictionary<string, ScopeType>
    {
        ["Altinn.App.Api.Controllers.StatelessDataController.Get (Altinn.App.Api)"] = ScopeType.Read,
        ["Altinn.App.Api.Controllers.StatelessDataController.Post (Altinn.App.Api)"] = ScopeType.Read,
    }.ToFrozenDictionary(StringComparer.Ordinal);

    private readonly FrozenSet<string> _instanceRelatedParameterNames = new HashSet<string>()
    {
        "instanceGuid",
        "instanceId",
        "instanceOwnerPartyId",
    }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    private FrozenDictionary<ApiEndpoint, ScopeRequirementMetadata>? _metadataLookup;

    public IReadOnlyList<ApiEndpointInfo> Metadata =>
        _metadataLookup
            ?.Select(kvp => new ApiEndpointInfo(kvp.Key.ToString(), kvp.Value))
            .OrderBy(kv => kv.Endpoint)
            .ToArray()
        ?? [];

    public bool HasDefinedCustomScopes { get; private set; }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _startedListener = _hostLifetime.ApplicationStarted.Register(() =>
        {
            // Population of `EndpointsDataSource` begins _after_ `IHostedService.StartAsync` has is started,
            // but when the host lifetime is reported as started all the endpoints should already be there
            // since that means the HTTP server is ready to accept requests. So we can safely initialize here.
            // If we don't do this here, that means we can have an unlucky request in the beginning
            // that hits initialization.
            _ = Initialize();
        });
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _startedListener?.Dispose();
        return Task.CompletedTask;
    }

    internal Task EnsureInitialized()
    {
        if (_initialization.Task.IsCompleted)
            return _initialization.Task;

        return Initialize();
    }

    internal ScopeRequirementMetadata LookupMetadata(ApiEndpoint endpoint)
    {
        if (_metadataLookup is null)
            throw new InvalidOperationException("Scope authorization service is not initialized");

        if (_metadataLookup.TryGetValue(endpoint, out var metadata))
            return metadata;

        throw new KeyNotFoundException($"No metadata found for endpoint '{endpoint}'");
    }

    private Task Initialize()
    {
        if (_generalSettings.Value.IsTest)
        {
            _initialization.TrySetResult();
            return _initialization.Task; // Skip initialization during WAF tests
        }
        if (_initialization.Task.IsCompleted)
            return _initialization.Task;

        if (Interlocked.CompareExchange(ref _initializing, 1, 0) != 0)
            return _initialization.Task; // Being initialized by another thread

        using var activity = _telemetry?.StartScopeAuthorizationServiceInitActivity();
        _logger.LogDebug("Starting scope authorization initialization");
        try
        {
            var appMetadata = _appConfigurationCache.ApplicationMetadata;

            HasDefinedCustomScopes =
                !string.IsNullOrWhiteSpace(appMetadata.ApiScopes?.Users?.Read)
                || !string.IsNullOrWhiteSpace(appMetadata.ApiScopes?.Users?.Write)
                || !string.IsNullOrWhiteSpace(appMetadata.ApiScopes?.ServiceOwners?.Read)
                || !string.IsNullOrWhiteSpace(appMetadata.ApiScopes?.ServiceOwners?.Write);
            ProcessEndpoints(appMetadata);

            _initialization.TrySetResult();
            _logger.LogInformation(
                "Scope authorization initialized. Processed {EndpointCount} endpoints",
                _metadataLookup?.Count ?? 0
            );
        }
        catch (Exception ex)
        {
            _initialization.TrySetException(ex);
            _logger.LogError(ex, "Failed to initialize scope authorization service");
            throw;
        }

        return _initialization.Task;
    }

    private void ProcessEndpoints(ApplicationMetadata appMetadata)
    {
        var metadataLookup = new Dictionary<ApiEndpoint, ScopeRequirementMetadata>();
        var endpoints = _endpointDataSources.SelectMany(ed => ed.Endpoints).ToArray();
        foreach (var endpointObj in endpoints)
        {
            if (endpointObj is not RouteEndpoint endpoint)
                throw new Exception("Unexpected endpoint type: " + endpointObj.GetType().FullName);

            var httpMethods = GetEndpointHttpMethods(endpoint);
            foreach (var httpMethod in httpMethods)
            {
                var metadata = new ScopeRequirementMetadata();

                var apiEndpoint = new ApiEndpoint(endpoint, httpMethod);
                metadataLookup.Add(apiEndpoint, metadata);

                // Check for manual inclusion
                if (
                    endpoint.DisplayName is not null
                    && _manuallyIncludeActions.TryGetValue(endpoint.DisplayName, out var scopeType)
                )
                {
                    ProcessEndpoint(appMetadata, metadata, scopeType, appMetadata.ApiScopes);
                    continue;
                }

                // Determine scope type based on HTTP methods
                scopeType = _readHttpMethods.Contains(httpMethod) ? ScopeType.Read : ScopeType.Write;

                // Check if endpoint should be authorized
                if (ShouldAuthorizeEndpoint(endpoint))
                {
                    ProcessEndpoint(appMetadata, metadata, scopeType, appMetadata.ApiScopes);
                }
            }
        }

        _metadataLookup = metadataLookup.ToFrozenDictionary();

        if (_logger.IsEnabled(LogLevel.Debug) && HasDefinedCustomScopes)
        {
            endpoints = _endpointDataSources.SelectMany(ed => ed.Endpoints).ToArray();

            var message = new StringBuilder("Endpoint API scope authorization summary:\n");
            foreach (var endpoint in endpoints)
            {
                var httpMethods = GetEndpointHttpMethods(endpoint);
                foreach (var httpMethod in httpMethods)
                {
                    var apiEndpoint = new ApiEndpoint(
                        endpoint as RouteEndpoint ?? throw new Exception("Not a route endpoint"),
                        httpMethod
                    );
                    var metadata = _metadataLookup.GetValueOrDefault(apiEndpoint);
                    if (metadata is not null)
                    {
                        message.Append("\t- ");
                        message.Append(apiEndpoint);
                        message.Append(":\n");
                        if (metadata.RequiredScopesUsers is not null)
                        {
                            message.Append("\t\t- User scopes: ");
                            message.Append(string.Join(", ", metadata.RequiredScopesUsers.Order()));
                            message.AppendLine();
                        }
                        else
                        {
                            message.AppendLine("\t\t- No user scopes");
                        }
                        if (metadata.RequiredScopesServiceOwners is not null)
                        {
                            message.Append("\t\t- Service owner scopes: ");
                            message.Append(string.Join(", ", metadata.RequiredScopesServiceOwners.Order()));
                            message.AppendLine();
                        }
                        else
                        {
                            message.AppendLine("\t\t- No Service owner scopes");
                        }

                        if (metadata.ErrorMessageTextResourceKeyUser is not null)
                        {
                            message.Append("\t\t- Error message resource key for missing/invalid user scope: ");
                            message.AppendLine(metadata.ErrorMessageTextResourceKeyUser);
                        }
                        if (metadata.ErrorMessageTextResourceKeyServiceOwner is not null)
                        {
                            message.Append(
                                "\t\t- Error message resource key for missing/invalid service owner scope: "
                            );
                            message.AppendLine(metadata.ErrorMessageTextResourceKeyServiceOwner);
                        }
                    }
                    else
                    {
                        message.Append("\t- ");
                        message.Append(apiEndpoint);
                        message.Append(": no scope authorization metadata specified\n");
                    }
                }
            }

            _logger.LogDebug(message.ToString());
        }
    }

    private void ProcessEndpoint(
        ApplicationMetadata appMetadata,
        ScopeRequirementMetadata metadata,
        ScopeType scopeType,
        ApiScopesConfiguration? apiScopes
    )
    {
        var fallbackTextResourceKey =
            appMetadata.ApiScopes?.ErrorMessageTextResourceKey ?? "authorization.scopes.insufficient";
        var usersScopeSet = CreateUsersScopesSet(scopeType, apiScopes?.Users);
        if (usersScopeSet is not null)
        {
            metadata.RequiredScopesUsers = usersScopeSet;
            metadata.ErrorMessageTextResourceKeyUser =
                appMetadata.ApiScopes?.Users?.ErrorMessageTextResourceKey ?? fallbackTextResourceKey;
        }

        var serviceOwnersScopeSet = CreateServiceOwnersScopesSet(scopeType, apiScopes?.ServiceOwners);
        if (serviceOwnersScopeSet is not null)
        {
            metadata.RequiredScopesServiceOwners = serviceOwnersScopeSet;
            metadata.ErrorMessageTextResourceKeyServiceOwner =
                appMetadata.ApiScopes?.ServiceOwners?.ErrorMessageTextResourceKey ?? fallbackTextResourceKey;
        }
    }

    internal static IEnumerable<string> GetEndpointHttpMethods(Endpoint endpoint)
    {
        // Check for HTTP method metadata
        var httpMethodMetadata = endpoint.Metadata.GetMetadata<IHttpMethodMetadata>();
        IReadOnlyList<string> httpMethods = ["GET", "POST"];
        if (httpMethodMetadata?.HttpMethods != null && httpMethodMetadata.HttpMethods.Any())
            httpMethods = httpMethodMetadata.HttpMethods;

        // For MVC controllers, check the action descriptor
        if (endpoint.Metadata.GetMetadata<ControllerActionDescriptor>() is { } actionDescriptor)
        {
            var httpMethodAttr = actionDescriptor.EndpointMetadata.OfType<IHttpMethodMetadata>().FirstOrDefault();
            if (httpMethodAttr?.HttpMethods != null && httpMethodAttr.HttpMethods.Any())
                httpMethods = httpMethodAttr.HttpMethods;
        }

        return httpMethods.Order().ToArray();
    }

    private bool ShouldAuthorizeEndpoint(RouteEndpoint endpoint)
    {
        // Skip endpoints with AllowAnonymous
        if (endpoint.Metadata.GetMetadata<AllowAnonymousAttribute>() is not null)
            return false;

        var routePattern = endpoint.RoutePattern;
        if (routePattern.Parameters.Any(p => _instanceRelatedParameterNames.Contains(p.Name)))
            return true;

        return (
            endpoint.Metadata.GetMetadata<ControllerActionDescriptor>() is { } descriptor
            && (
                descriptor.ControllerTypeInfo == typeof(InstancesController)
                || descriptor.Parameters.Any(p => _instanceRelatedParameterNames.Contains(p.Name))
            )
        );
    }

    private FrozenSet<string>? CreateUsersScopesSet(ScopeType type, ApiScopes? apiScopes)
    {
        var configuredScope = type == ScopeType.Read ? apiScopes?.Read : apiScopes?.Write;
        if (string.IsNullOrWhiteSpace(configuredScope))
            return null;

        var appMetadata = _appConfigurationCache.ApplicationMetadata;
        configuredScope = configuredScope.Replace("[app]", appMetadata.AppIdentifier.App);
        return new[] { configuredScope, "altinn:portal/enduser" }.ToFrozenSet(StringComparer.Ordinal);
    }

    private FrozenSet<string>? CreateServiceOwnersScopesSet(ScopeType type, ApiScopes? apiScopes)
    {
        var configuredScope = type == ScopeType.Read ? apiScopes?.Read : apiScopes?.Write;
        if (string.IsNullOrWhiteSpace(configuredScope))
            return null;

        var appMetadata = _appConfigurationCache.ApplicationMetadata;
        configuredScope = configuredScope.Replace("[app]", appMetadata.AppIdentifier.App);
        return new[] { configuredScope }.ToFrozenSet(StringComparer.Ordinal);
    }
}

internal sealed record ApiEndpointInfo(string Endpoint, ScopeRequirementMetadata Metadata);

internal readonly struct ApiEndpoint : IEquatable<ApiEndpoint>
{
    private readonly RouteEndpoint _endpoint;
    private readonly string _method;
    private readonly string _route;

    public RouteEndpoint Endpoint => _endpoint;

    public ApiEndpoint(RouteEndpoint endpoint, string method)
    {
        _endpoint = endpoint;
        _method = method;
        _route = endpoint.RoutePattern.RawText ?? throw new Exception("Route pattern raw text is null");
    }

    public bool Equals(ApiEndpoint other) =>
        _method.Equals(other._method, StringComparison.OrdinalIgnoreCase)
        && _route.Equals(other._route, StringComparison.Ordinal);

    public override bool Equals(object? obj) => obj is ApiEndpoint other && Equals(other);

    public override int GetHashCode()
    {
        HashCode hashCode = default;
        hashCode.Add(_method, StringComparer.OrdinalIgnoreCase);
        hashCode.Add(_route, StringComparer.Ordinal);
        return hashCode.ToHashCode();
    }

    public override string ToString() => $"{_method} {_route}";
}
