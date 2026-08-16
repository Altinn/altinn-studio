using System;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Common;

public static class Hosting
{
    private static readonly string[] _localEnvironments = ["local", "development"];

    extension(WebApplicationBuilder builder)
    {
        /// <summary>
        /// Configures the application with common settings.
        /// </summary>
        public WebApplicationBuilder UseCommonHostingConfiguration()
        {
            builder.UseHeaderForwarding();

            return builder;
        }

        /// <summary>
        /// Configures the application to use ProblemDetails for bad requests.
        /// </summary>
        /// <remarks>
        /// Use in conjunction with the <see cref="Microsoft.AspNetCore.Builder.ExceptionHandlerExtensions.UseExceptionHandler(IApplicationBuilder)"/> middleware.
        /// </remarks>
        public WebApplicationBuilder UseProblemDetailsForBadRequests()
        {
            builder.Services.AddProblemDetails();
            builder.Services.AddExceptionHandler<BadRequestExceptionHandler>();
            builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);

            return builder;
        }

        /// <summary>
        /// Configures the application to use camelCase for JSON serialization, with case-insensitive deserialization support.
        /// </summary>
        public WebApplicationBuilder UseCaseInsensitiveCamelCaseJson(bool allowOutOfOrderMetadataProperties = true)
        {
            builder.Services.ConfigureHttpJsonOptions(options =>
            {
                options.SerializerOptions.AllowOutOfOrderMetadataProperties = allowOutOfOrderMetadataProperties;
                options.SerializerOptions.PropertyNameCaseInsensitive = true;
                options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            });

            return builder;
        }

        /// <summary>
        /// Configures the application to forward headers from reverse proxies.
        /// </summary>
        /// <remarks>
        /// When running in a real environment, we are situated behind a reverse proxy/load balancer.
        /// At the time of writing, this is a Traefik ingress controller (k8s).
        /// </remarks>
        public WebApplicationBuilder UseHeaderForwarding()
        {
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.All;
                options.ForwardLimit = 3;
                options.KnownIPNetworks.Clear();
#pragma warning disable ASPDEPR005 // Type or member is obsolete
                options.KnownNetworks.Clear();
#pragma warning restore ASPDEPR005 // Type or member is obsolete
                options.KnownProxies.Clear();

                if (_localEnvironments.Contains(builder.Environment.EnvironmentName, StringComparer.OrdinalIgnoreCase))
                {
                    // Running locally, let's just trust any network
                    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Any, 0));
                    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.IPv6Any, 0));
                }
                else
                {
                    // IP ranges used internally in the deployed clusters
                    // This makes sure we only trust the X-Forwarded-* headers for requests
                    // originating from these ranges.
                    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Parse("10.240.0.0"), 16));
                    options.KnownIPNetworks.Add(new System.Net.IPNetwork(IPAddress.Parse("fd10:59f0:8c79:240::"), 64));
                }
            });

            return builder;
        }
    }

    private sealed class BadRequestExceptionHandler : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken
        )
        {
            if (exception is not BadHttpRequestException badRequest)
                return false;

            var problemDetails = new ProblemDetails
            {
                Status = badRequest.StatusCode,
                Title = "Bad Request",
                Detail = badRequest.InnerException?.Message ?? badRequest.Message,
                Extensions = { ["traceId"] = Activity.Current?.Id ?? httpContext.TraceIdentifier },
            };

            httpContext.Response.StatusCode = badRequest.StatusCode;
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

            return true;
        }
    }
}
