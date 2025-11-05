#nullable disable
using System.IO;
using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.IO;

public class IoExceptionFilterAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        base.OnException(context);

        if (context.ActionDescriptor is not ControllerActionDescriptor)
        {
            return;
        }

        // TODO: Implement custom IO exceptions
        if (context.Exception is FileNotFoundException)
        {
            // TODO: Implement custom IO exceptions Error Codes
            context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, IoErrorCodes.ResourceNotFound, HttpStatusCode.NotFound)) { StatusCode = (int)HttpStatusCode.NotFound };
        }
        if (context.Exception is DirectoryNotFoundException)
        {
            // TODO: Implement custom IO exceptions Error Codes
            context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, IoErrorCodes.ResourceNotFound, HttpStatusCode.NotFound)) { StatusCode = (int)HttpStatusCode.NotFound };
        }
    }
}
