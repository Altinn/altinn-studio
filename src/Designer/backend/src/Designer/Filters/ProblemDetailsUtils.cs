#nullable disable
using System;
using System.Collections.Generic;
using System.Net;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Filters
{
    public static class ProblemDetailsUtils
    {
        public static ProblemDetails GenerateProblemDetails(string customErrorCode, HttpStatusCode statusCode)
        {
            ProblemDetails details = new() { Status = (int)statusCode };
            details.Extensions.Add(ProblemDetailsExtensionsCodes.ErrorCode, customErrorCode);
            return details;
        }

        public static ProblemDetails GenerateProblemDetails(
            Exception ex,
            string customErrorCode,
            HttpStatusCode statusCode,
            List<string> customErrorMessages = null
        )
        {
            string exceptionType = ex.GetType().Name;
            ProblemDetails details = GenerateProblemDetails(customErrorCode, statusCode);
            details.Title = $"{exceptionType} occurred.";
            details.Detail = ex.Message;
            details.Type = exceptionType;

            if (customErrorMessages is not null)
            {
                details.Extensions.Add("customErrorMessages", customErrorMessages);
            }
            return details;
        }
    }
}
