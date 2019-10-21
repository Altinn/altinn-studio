using System;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AltinnCore.Runtime.RestControllers
{
    /// <summary>
    /// Turns of binding of attachement
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class DisableFormValueModelBindingAttribute : Attribute, IResourceFilter
    {
        /// <summary>
        /// Called before resource is processed and turns of formvalue provider an jquery provider
        /// </summary>
        /// <param name="context">the execution context</param>
        public void OnResourceExecuting(ResourceExecutingContext context)
        {
            var factories = context.ValueProviderFactories;
            factories.RemoveType<FormValueProviderFactory>();
            factories.RemoveType<JQueryFormValueProviderFactory>();
        }

        /// <summary>
        /// Called after resource is processed. Does nothing.
        /// </summary>
        /// <param name="context">the execution context</param>
        public void OnResourceExecuted(ResourceExecutedContext context)
        {
        }
    }
}
