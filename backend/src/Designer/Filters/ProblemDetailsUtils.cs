using System;
using System.Collections.Generic;
using System.Net;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Filters
{
    public static class ProblemDetailsUtils
    {
        public static ProblemDetails GenerateProblemDetails(Exception ex, string customErrorCode, HttpStatusCode statusCode, List<string> customErrorMessages = null)
        {
            string exceptionType = ex.GetType().Name;
            ProblemDetails details = new()
            {
                Title = $"{exceptionType} occured.",
                Detail = ex.Message,
                Status = (int)statusCode,
                Type = exceptionType
            };
            details.Extensions.Add(ProblemDetailsExtensionsCodes.ErrorCode, customErrorCode);

            if (customErrorMessages is not null)
            {
                details.Extensions.Add("customErrorMessages", customErrorMessages);
            }
            return details;
        }
    }
}
