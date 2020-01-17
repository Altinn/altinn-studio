using System;
using System.Net;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;
using Microsoft.Rest.TransientFaultHandling;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for error handling
    /// </summary>
    [ApiController]
    public class ErrorController : ControllerBase
    {
        /// <summary>
        /// Action for local error handling
        /// </summary>
        /// <param name="webHostEnvironment">IHostingEnvironment</param>
        /// <returns></returns>
        [Route("/error-local-development")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public IActionResult ErrorLocalDevelopment(
            [FromServices] IWebHostEnvironment webHostEnvironment)
        {
            if (!webHostEnvironment.IsDevelopment())
            {
                throw new InvalidOperationException(
                    "This shouldn't be invoked in non-development environments.");
            }

            IExceptionHandlerPathFeature feature = HttpContext.Features.Get<IExceptionHandlerPathFeature>();
            Exception ex = feature?.Error;

            ProblemDetails problemDetails = new ProblemDetails
            {
                Status = (int)FindStatusCode(ex),
                Instance = feature?.Path,
                Title = ex?.GetType().Name,
                Detail = ex?.StackTrace,
            };

            return StatusCode(problemDetails.Status.Value, problemDetails);
        }

        /// <summary>
        /// Action for other environment handling than local
        /// </summary>
        /// <param name="webHostEnvironment">IHostingEnvironment</param>
        /// <returns></returns>
        [Route("/error")]
        [ApiExplorerSettings(IgnoreApi = true)]
        public ActionResult Error(
            [FromServices] IWebHostEnvironment webHostEnvironment)
        {
            IExceptionHandlerPathFeature feature = HttpContext.Features.Get<IExceptionHandlerPathFeature>();
            Exception ex = feature?.Error;
            bool isDev = webHostEnvironment.IsDevelopment();
            ProblemDetails problemDetails = new ProblemDetails
            {
                Status = (int)FindStatusCode(ex),
                Instance = feature?.Path,
                Title = isDev ? $"{ex?.GetType().Name}: {ex?.Message}" : "An error occurred.",
                Detail = isDev ? ex?.StackTrace : null,
            };

            return StatusCode(problemDetails.Status.Value, problemDetails);
        }

        private static HttpStatusCode FindStatusCode(Exception ex)
        {
            if (ex is HttpRequestWithStatusException httpException)
            {
                if (httpException.StatusCode >= HttpStatusCode.BadRequest &&
                    httpException.StatusCode < HttpStatusCode.InternalServerError)
                {
                    return httpException.StatusCode;
                }
            }
            else if (ex is NotFoundHttpRequestException)
            {
                return HttpStatusCode.NotFound;
            }

            return HttpStatusCode.InternalServerError;
        }
    }
}
