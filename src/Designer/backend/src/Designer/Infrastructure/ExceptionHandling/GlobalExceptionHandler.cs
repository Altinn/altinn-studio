using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.Infrastructure.ExceptionHandling;

public sealed class GlobalExceptionHandler(IProblemDetailsService problemDetailsService, IHostEnvironment environment)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken
    )
    {
        HttpStatusCode statusCode = ResolveStatusCode(exception);
        httpContext.Response.StatusCode = (int)statusCode;

        bool includeExceptionDetails = environment.IsDevelopment();

        await problemDetailsService.TryWriteAsync(
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = exception,
                ProblemDetails =
                {
                    Status = (int)statusCode,
                    Title = includeExceptionDetails ? exception.GetType().Name : "An error occurred.",
                    Detail = includeExceptionDetails ? exception.StackTrace : null,
                    Instance = httpContext.Request.Path,
                },
            }
        );

        return true;
    }

    private static HttpStatusCode ResolveStatusCode(Exception exception) =>
        exception switch
        {
            HttpRequestWithStatusException
            {
                StatusCode: >= HttpStatusCode.BadRequest and < HttpStatusCode.InternalServerError
            } httpException => httpException.StatusCode,
            NotFoundHttpRequestException => HttpStatusCode.NotFound,
            _ => HttpStatusCode.InternalServerError,
        };
}
