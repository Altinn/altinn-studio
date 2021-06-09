using System;

using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.App.Api.Filters
{
    /// <summary>
    /// A filter for setting no cache headers on response messages
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
    public class NoCacheHeaderFilter : ActionFilterAttribute
    {
        /// <inheritdoc/>
        public override void OnActionExecuted(ActionExecutedContext context)
        {
            context.HttpContext.Response.Headers.Add("Pragma", "no-cache");
            context.HttpContext.Response.Headers.Add("Cache-Control", "no-store");

            base.OnActionExecuted(context);
        }
    }
}
