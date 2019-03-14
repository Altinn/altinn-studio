using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AltinnCore.Common.Attributes
{
    /// <summary>
    /// An attribute for disabling form binding
    /// </summary>
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class DisableFormValueModelBindingAttribute : Attribute, IResourceFilter
    {
        /// <summary>
        /// On resource executing
        /// </summary>
        /// <param name="context">The context</param>
        public void OnResourceExecuting(ResourceExecutingContext context)
        {
            FormValueProviderFactory formValueProviderFactory = context.ValueProviderFactories
                .OfType<FormValueProviderFactory>()
                .FirstOrDefault();
            if (formValueProviderFactory != null)
            {
                context.ValueProviderFactories.Remove(formValueProviderFactory);
            }

            JQueryFormValueProviderFactory jqueryFormValueProviderFactory = context.ValueProviderFactories
                .OfType<JQueryFormValueProviderFactory>()
                .FirstOrDefault();
            if (jqueryFormValueProviderFactory != null)
            {
                context.ValueProviderFactories.Remove(jqueryFormValueProviderFactory);
            }
        }

        /// <summary>
        /// On resource executed
        /// </summary>
        /// <param name="context">The context</param>
        public void OnResourceExecuted(ResourceExecutedContext context)
        {
        }
    }
}
