using System;
using System.Collections.Generic;
using System.Net;
using Altinn.Studio.Designer.Models;
using LibGit2Sharp;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.Git
{
    public class GitExceptionFilterAttribute : ExceptionFilterAttribute
    {
        public override void OnException(ExceptionContext context)
        {
            base.OnException(context);

            if (context.ActionDescriptor is not ControllerActionDescriptor)
            {
                return;
            }

            if (context.Exception is NonFastForwardException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, GitErrorCodes.NonFastForwardError, HttpStatusCode.Conflict)) { StatusCode = (int)HttpStatusCode.Conflict };
            }

        }
    }
}
