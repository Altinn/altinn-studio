using System;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AltinnCore.Designer.ModelBinding
{
    /// <summary>
    /// Special BinderProvider to support JSON and XML on the same method for posting through REST-API
    /// </summary>
    public class AltinnCoreApiModelBinderProvider : IModelBinderProvider
    {
        /// <summary>
        /// Returns the specific API binder
        /// </summary>
        /// <param name="context">The context</param>
        /// <returns>The binder</returns>
        public IModelBinder GetBinder(ModelBinderProviderContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException(nameof(context));
            }

            var modelType = context.Metadata.ModelType;

            if (modelType.Equals(typeof(AltinnCoreApiModel)))
            {
               return new AltinnCoreApiModelBinder();
            }

            return null;
        }
    }
}
