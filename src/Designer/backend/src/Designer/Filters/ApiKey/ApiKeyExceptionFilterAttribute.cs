using System.Net;
using Altinn.Studio.Designer.Exceptions.ApiKey;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.ApiKey;

public class ApiKeyExceptionFilterAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext context)
    {
        base.OnException(context);

        if (context.ActionDescriptor is not ControllerActionDescriptor)
        {
            return;
        }

        if (context.Exception is DuplicateTokenNameException)
        {
            context.Result = new ObjectResult(
                ProblemDetailsUtils.GenerateProblemDetails(
                    context.Exception,
                    ApiKeyErrorCodes.DuplicateTokenName,
                    HttpStatusCode.Conflict
                )
            )
            {
                StatusCode = (int)HttpStatusCode.Conflict,
            };
        }
    }
}
