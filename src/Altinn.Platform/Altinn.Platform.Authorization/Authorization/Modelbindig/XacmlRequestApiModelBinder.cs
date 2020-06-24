using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.Platform.Authorization.ModelBinding
{
    /// <summary>
    /// Custom model binder to be able to read the Request Body and later Deserialize it.
    /// The body is not available inside a controller method
    /// </summary>
    public class XacmlRequestApiModelBinder : IModelBinder
    {
        /// <summary>
        /// Binds the Body to the AltinnCoreApiModel
        /// </summary>
        /// <param name="bindingContext">the binding context</param>
        /// <returns>The task</returns>
        public async Task BindModelAsync(ModelBindingContext bindingContext)
        {
            if (bindingContext == null)
            {
                throw new ArgumentNullException(nameof(bindingContext));
            }

            // Special logic for body, treat the model name as string.Empty for the top level
            // object, but allow an override via BinderModelName. The purpose of this is to try
            // and be similar to the behavior for POCOs bound via traditional model binding.
            string modelBindingKey;
            if (bindingContext.IsTopLevelObject)
            {
                modelBindingKey = bindingContext.BinderModelName ?? string.Empty;
            }
            else
            {
                modelBindingKey = bindingContext.ModelName;
            }

            HttpContext httpContext = bindingContext.HttpContext;

            try
            {
                using (StreamReader reader = new StreamReader(httpContext.Request.Body))
                {
                    string input = await reader.ReadToEndAsync();
                    bindingContext.Model = new XacmlRequestApiModel() { BodyContent = input };
                    bindingContext.Result = ModelBindingResult.Success(bindingContext.Model);
                    return;
                }
            }
            catch (Exception ex)
            {
                bindingContext.ModelState.AddModelError(modelBindingKey, ex, bindingContext.ModelMetadata);
                return;
            }
        }
    }
}
