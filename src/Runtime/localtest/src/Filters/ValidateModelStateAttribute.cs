using System;

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Platform.Register.Filters
{
    /// <summary>
    /// An action filter for automatically checking model state before a controller action is executed.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
    public class ValidateModelStateAttribute : ActionFilterAttribute
    {
        /// <summary>
        /// Called by the ASP.NET API framework before the action method executes.
        /// </summary>
        /// <param name="context">The filter context.</param>
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            if (context.Result != null)
            {
                // Do not overwrite an existing result.
                return;
            }

            if (!context.ModelState.IsValid)
            {
                context.Result = new BadRequestObjectResult(context.ModelState);
            }
        }
    }
}
