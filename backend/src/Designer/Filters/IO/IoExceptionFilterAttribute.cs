using System.IO;
using System.Net;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.Designer.Filters.DataModeling;
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
            context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, "File not found", HttpStatusCode.InternalServerError)) { StatusCode = (int)HttpStatusCode.InternalServerError };
        }
    }
}
