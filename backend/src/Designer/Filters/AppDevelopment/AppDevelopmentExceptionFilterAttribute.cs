using System.Net;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.AppDevelopment
{
    public class AppDevelopmentExceptionFilterAttribute : ExceptionFilterAttribute
    {
        public override void OnException(ExceptionContext context)
        {
            base.OnException(context);

            if (context.ActionDescriptor is not ControllerActionDescriptor)
            {
                return;
            }

            if (context.Exception is NoLayoutSetsFileFoundException)
            {
                context.Result = new StatusCodeResult((int)HttpStatusCode.OK);
            }
            if (context.Exception is NonUniqueLayoutSetIdException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, AppDevelopmentErrorCodes.NonUniqueLayoutSetIdError, HttpStatusCode.Conflict)) { StatusCode = (int)HttpStatusCode.OK };
            }
            if (context.Exception is NonUniqueTaskForLayoutSetException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, AppDevelopmentErrorCodes.NonUniqueTaskForLayoutSetError, HttpStatusCode.Conflict)) { StatusCode = (int)HttpStatusCode.OK };
            }
            if (context.Exception is InvalidLayoutSetIdException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, AppDevelopmentErrorCodes.EmptyLayoutSetIdError, HttpStatusCode.BadRequest)) { StatusCode = (int)HttpStatusCode.BadRequest };
            }
        }
    }
}
