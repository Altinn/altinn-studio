using System;
using System.Collections.Generic;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// Helper for creating the RequestContext
    /// </summary>
    public static class RequestHelper
    {
        /// <summary>
        /// Build the request context
        /// </summary>
        /// <param name="queryCollection">The query parameters</param>
        /// <param name="instanceId">The instanceId</param>
        /// <returns>The requestContext</returns>
        public static RequestContext GetRequestContext(IQueryCollection queryCollection, Guid instanceId)
        {
            var context = new RequestContext
            {
                Params = new Dictionary<string, string>(),
                InstanceId = instanceId,
            };

            if (queryCollection != null)
            {
                foreach (string key in queryCollection.Keys)
                {
                    context.Params.Add(key, queryCollection[key]);
                }
            }

            return context;
        }

        /// <summary>
        /// Checks the request for the standard user actions for the plattform
        /// based on
        /// </summary>
        /// <param name="request">the http request</param>
        /// <returns>the standard user action</returns>
        public static UserActionType GetStandardUserAction(HttpRequest request)
        {
            if (request != null && request.Method.ToUpper() == "POST")
            {
                IFormCollection form = request.Form;
                if (form.ContainsKey("NavigationButtonNext"))
                {
                    return UserActionType.NavigateNext;
                }

                if (form.ContainsKey("NavigationButtonPrevious"))
                {
                    return UserActionType.NavigatePrevious;
                }

                if (form.ContainsKey("NavigationButtonSubmit"))
                {
                    return UserActionType.Submit;
                }

                if (form.ContainsKey("NavigationButtonValidate")
                    || !string.IsNullOrEmpty(request.Query["Validate"]))
                {
                    return UserActionType.Validate;
                }
            }

            return UserActionType.Default;
        }
    }
}
