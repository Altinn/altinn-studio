using System;
using Altinn.Studio.Designer.Exceptions.ProcessEditing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Filters.ProcessEditing;

/// <summary>
/// Maps the exceptions of a process edit to responses: an edit made against a version that is no longer saved is a
/// conflict, and an edit that is not valid is a bad request. Both are rejected before anything is written. Any other
/// exception is an internal server error, because it may have been raised once the edit was partly applied.
/// </summary>
public class ProcessEditingExceptionFilterAttribute : ExceptionFilterAttribute
{
    private const string ProcessStateConflict = "process_state_conflict";

    public override void OnException(ExceptionContext context)
    {
        base.OnException(context);

        if (context.ActionDescriptor is not ControllerActionDescriptor)
        {
            return;
        }

        switch (context.Exception)
        {
            case ProcessEditConflictException:
                context.Result = new ConflictObjectResult(
                    new { code = ProcessStateConflict, message = context.Exception.Message }
                );
                break;
            case ProcessEditValidationException:
                context.Result = new BadRequestObjectResult(context.Exception.Message);
                break;
            case OperationCanceledException:
                // The request was aborted before anything was written.
                return;
            default:
            {
                // The exception is handled here, so the framework does not log it.
                ILogger logger = context.HttpContext.RequestServices.GetRequiredService<
                    ILogger<ProcessEditingExceptionFilterAttribute>
                >();
                logger.LogError(context.Exception, "A process edit failed.");
                context.Result = new StatusCodeResult(StatusCodes.Status500InternalServerError);
                break;
            }
        }
        // The global AppDevelopmentExceptionFilterAttribute runs after this filter unless the exception is handled,
        // and would answer some exceptions, such as a layout set name that is already used, with 200 OK or 400. Here
        // the process editor must not take an edit that failed for one that was applied, or one that failed once
        // writing had begun for one that was rejected before anything was written.
        context.ExceptionHandled = true;
    }
}
