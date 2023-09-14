using System;
using System.Net;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Filters
{
    public static class ProblemDetailsUtils
    {
        public static ProblemDetails GenerateProblemDetails(Exception ex, string customErrorCode, HttpStatusCode statusCode)
        {
            string exceptionType = ex.GetType().Name;
            ProblemDetails details = new ProblemDetails
            {
                Title = $"{exceptionType} occured.",
                Detail = ex.Message,
                Status = (int)HttpStatusCode.Conflict,
                Type = exceptionType
            };
            details.Extensions.Add("errorCode", customErrorCode);
            return details;
        }
    }
}
