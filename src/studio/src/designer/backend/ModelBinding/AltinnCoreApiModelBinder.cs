using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.Studio.Designer.ModelBinding
{
    /// <summary>
    /// Custom model binder to be able to read the Request Body and later Deserialize it.
    /// The body is not available inside a controller method
    /// </summary>
    public class AltinnCoreApiModelBinder : IModelBinder
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

            var httpContext = bindingContext.HttpContext;

            try
            {
                var input = await new StreamReader(httpContext.Request.Body).ReadToEndAsync();
                bindingContext.Model = new AltinnCoreApiModel() { BodyContent = input };
                bindingContext.Result = ModelBindingResult.Success(bindingContext.Model);

                return;
            }
            catch (Exception ex)
            {
                bindingContext.ModelState.AddModelError(modelBindingKey, ex, bindingContext.ModelMetadata);
                return;
            }
        }
    }
}
