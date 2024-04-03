using System.Net;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;
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

            if (context.Exception is RepositoryNotFoundException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, GitErrorCodes.RepositoryNotFound, HttpStatusCode.NotFound)) { StatusCode = (int)HttpStatusCode.NotFound };
            }

            if (context.Exception is GiteaUnathorizedException || (context.Exception is LibGit2SharpException && context.Exception.Message.Contains("server requires authentication that we do not support")))
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, GitErrorCodes.GiteaSessionExpired, HttpStatusCode.Unauthorized)) { StatusCode = (int)HttpStatusCode.Unauthorized };
            }
        }
    }
}
