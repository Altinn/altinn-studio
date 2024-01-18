﻿using System.Net;
using Altinn.Studio.DataModeling.Converter.Csharp;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Converter.Xml;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.DataModeling
{
    public class DataModelingExceptionFilterAttribute : ExceptionFilterAttribute
    {
        public override void OnException(ExceptionContext context)
        {
            base.OnException(context);

            if (context.ActionDescriptor is not ControllerActionDescriptor)
            {
                return;
            }

            if (context.Exception is CsharpCompilationException compilationException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.CsharpGenerationError, HttpStatusCode.BadRequest, compilationException.CustomErrorMessages)) { StatusCode = (int)HttpStatusCode.BadRequest };
            }

            if (context.Exception is CsharpGenerationException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.CsharpGenerationError, HttpStatusCode.UnprocessableEntity)) { StatusCode = (int)HttpStatusCode.UnprocessableEntity };
            }

            if (context.Exception is XmlSchemaConvertException xmlSchemaConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.XmlSchemaConvertError, HttpStatusCode.UnprocessableEntity, xmlSchemaConvertException.CustomErrorMessages)) { StatusCode = (int)HttpStatusCode.UnprocessableEntity };
            }

            if (context.Exception is JsonSchemaConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.JsonSchemaConvertError, HttpStatusCode.UnprocessableEntity)) { StatusCode = (int)HttpStatusCode.UnprocessableEntity };
            }

            if (context.Exception is MetamodelConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.ModelMetadataConvertError, HttpStatusCode.UnprocessableEntity)) { StatusCode = (int)HttpStatusCode.UnprocessableEntity };
            }
        }
    }
}
