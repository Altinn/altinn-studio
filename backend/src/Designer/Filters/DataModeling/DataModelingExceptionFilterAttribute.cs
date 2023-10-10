using System.Net;
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

            if (context.Exception is CsharpGenerationException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.CsharpGenerationError, HttpStatusCode.InternalServerError)) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }

            if (context.Exception is XmlSchemaConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.XmlSchemaConvertError, HttpStatusCode.InternalServerError)) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }

            if (context.Exception is JsonSchemaConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.JsonSchemaConvertError, HttpStatusCode.InternalServerError)) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }

            if (context.Exception is MetamodelConvertException)
            {
                context.Result = new ObjectResult(ProblemDetailsUtils.GenerateProblemDetails(context.Exception, DataModelingErrorCodes.ModelMetadataConvertError, HttpStatusCode.InternalServerError)) { StatusCode = (int)HttpStatusCode.InternalServerError };
            }
        }
    }
}
