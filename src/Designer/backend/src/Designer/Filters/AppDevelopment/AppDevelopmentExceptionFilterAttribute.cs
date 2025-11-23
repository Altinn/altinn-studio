#nullable disable
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
            if (context.Exception is NonUniqueLayoutSetIdException or NonUniqueTaskForLayoutSetException)
            {
                context.Result = new ObjectResult(new { infoMessage = context.Exception.Message }) { StatusCode = (int)HttpStatusCode.OK };
            }
            if (context.Exception is InvalidLayoutSetIdException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, AppDevelopmentErrorCodes.InvalidLayoutSetIdError, HttpStatusCode.BadRequest)) { StatusCode = (int)HttpStatusCode.BadRequest };
            }
            if (context.Exception is ConflictingFileNameException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, AppDevelopmentErrorCodes.ConflictingFileNameError, HttpStatusCode.BadRequest)) { StatusCode = (int)HttpStatusCode.BadRequest };
            }
            if (context.Exception is InvalidExtensionImageUploadException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, AppDevelopmentErrorCodes.UploadedImageNotValid, HttpStatusCode.BadRequest)) { StatusCode = (int)HttpStatusCode.BadRequest };
            }
        }
    }
}
