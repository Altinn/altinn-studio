using System;
using System.Net;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Converter.Xml;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.Datamodeling
{
    public class DatamodelingExceptionFilterAttribute : ExceptionFilterAttribute
    {
        public override void OnException(ExceptionContext context)
        {
            base.OnException(context);

            if (context.ActionDescriptor is not ControllerActionDescriptor)
            {
                return;
            }

            if (context.Exception is CsharpGenerationException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DatamodelingErrorCodes.CsharpGenerationError,HttpStatusCode.InternalServerError )) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }

            if (context.Exception is XmlSchemaConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DatamodelingErrorCodes.XmlSchemaConvertError,HttpStatusCode.InternalServerError )) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }

            if (context.Exception is JsonSchemaConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DatamodelingErrorCodes.JsonSchemaConvertError,HttpStatusCode.InternalServerError )) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }

            if (context.Exception is MetamodelConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DatamodelingErrorCodes.ModelMetadataConvertError,HttpStatusCode.InternalServerError )) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }
        }
    }
}
