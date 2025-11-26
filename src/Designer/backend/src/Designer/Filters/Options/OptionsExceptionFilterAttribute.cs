#nullable disable
using System.Net;
using Altinn.Studio.Designer.Exceptions.Options;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.Options;

public class OptionsExceptionFilterAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        base.OnException(context);

        if (context.ActionDescriptor is not ControllerActionDescriptor)
        {
            return;
        }

        if (context.Exception is InvalidOptionsFormatException)
        {
            context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, OptionsErrorCodes.InvalidOptionsFormat, HttpStatusCode.BadRequest)) { StatusCode = (int)HttpStatusCode.BadRequest };
        }
    }

}
