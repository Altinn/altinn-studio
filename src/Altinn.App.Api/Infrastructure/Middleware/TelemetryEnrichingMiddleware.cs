using System.Collections.Frozen;
using System.Diagnostics;
using System.Security.Claims;
using Altinn.App.Core.Features;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http.Features;

namespace Altinn.App.Api.Infrastructure.Middleware;

internal sealed class TelemetryEnrichingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TelemetryEnrichingMiddleware> _logger;
    private static readonly FrozenDictionary<string, Action<Claim, Activity>> _claimActions;

    static TelemetryEnrichingMiddleware()
    {
        var actions = new Dictionary<string, Action<Claim, Activity>>(StringComparer.OrdinalIgnoreCase)
        {
            { AltinnCoreClaimTypes.UserName, static (claim, activity) => activity.SetUsername(claim.Value) },
            {
                AltinnCoreClaimTypes.UserId,
                static (claim, activity) =>
                {
                    if (int.TryParse(claim.Value, out var result))
                    {
                        activity.SetUserId(result);
                    }
                }
            },
            {
                AltinnCoreClaimTypes.PartyID,
                static (claim, activity) =>
                {
                    if (int.TryParse(claim.Value, out var result))
                    {
                        activity.SetUserPartyId(result);
                    }
                }
            },
            {
                AltinnCoreClaimTypes.AuthenticateMethod,
                static (claim, activity) => activity.SetAuthenticationMethod(claim.Value)
            },
            {
                AltinnCoreClaimTypes.AuthenticationLevel,
                static (claim, activity) =>
                {
                    if (int.TryParse(claim.Value, out var result))
                    {
                        activity.SetAuthenticationLevel(result);
                    }
                }
            },
            { AltinnCoreClaimTypes.Org, static (claim, activity) => activity.SetOrganisationName(claim.Value) },
            { AltinnCoreClaimTypes.OrgNumber, static (claim, activity) => activity.SetOrganisationNumber(claim.Value) },
        };

        _claimActions = actions.ToFrozenDictionary();
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="TelemetryEnrichingMiddleware"/> class.
    /// </summary>
    /// <param name="next">The next middleware in the pipeline.</param>
    /// <param name="logger">The logger instance.</param>
    public TelemetryEnrichingMiddleware(RequestDelegate next, ILogger<TelemetryEnrichingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// Invokes the middleware to process the HTTP context.
    /// </summary>
    /// <param name="context">The HTTP context.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        var activity = context.Features.Get<IHttpActivityFeature>()?.Activity;
        if (activity is null)
        {
            await _next(context);
            return;
        }

        try
        {
            foreach (var claim in context.User.Claims)
            {
                if (_claimActions.TryGetValue(claim.Type, out var action))
                {
                    action(claim, activity);
                }
            }

            // Set telemetry tags with route values if available.
            if (
                context.Request.RouteValues.TryGetValue("instanceOwnerPartyId", out var instanceOwnerPartyId)
                && instanceOwnerPartyId != null
                && int.TryParse(instanceOwnerPartyId.ToString(), out var instanceOwnerPartyIdInt)
            )
            {
                activity.SetInstanceOwnerPartyId(instanceOwnerPartyIdInt);
            }

            var routeValues = context.Request.RouteValues;
            if (
                routeValues.TryGetValue("instanceGuid", out var instanceGuidObj) && instanceGuidObj is Guid instanceGuid
            )
            {
                activity.SetInstanceId(instanceGuid);
            }

            if (routeValues.TryGetValue("dataGuid", out var dataGuidObj) && dataGuidObj is Guid dataGuid)
            {
                activity.SetDataElementId(dataGuid);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while enriching telemetry.");
        }

        await _next(context);
    }
}

/// <summary>
/// Extension methods for adding the <see cref="TelemetryEnrichingMiddleware"/> to the application pipeline.
/// </summary>
public static class TelemetryEnrichingMiddlewareExtensions
{
    /// <summary>
    /// Adds the <see cref="TelemetryEnrichingMiddleware"/> to the application's request pipeline.
    /// </summary>
    /// <param name="app">The application builder.</param>
    public static IApplicationBuilder UseTelemetryEnricher(this IApplicationBuilder app)
    {
        return app.UseMiddleware<TelemetryEnrichingMiddleware>(
            app.ApplicationServices.GetRequiredService<ILogger<TelemetryEnrichingMiddleware>>()
        );
    }
}
