// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace AltinnCore.Designer.ModelBinding
{
    /// <summary>
    /// An <see cref="IModelBinderProvider"/> for <see cref="ICollection{T}"/>.
    /// </summary>
    public class AltinnCoreCollectionModelBinderProvider : IModelBinderProvider
    {
        /// <inheritdoc />
        public IModelBinder GetBinder(ModelBinderProviderContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException(nameof(context));
            }

            var modelType = context.Metadata.ModelType;

            // Arrays are handled by another binder.
            if (modelType.IsArray)
            {
                return null;
            }

            // If the model type is ICollection<> then we can call its Add method, so we can always support it.
            var collectionType = ClosedGenericMatcher.ExtractGenericInterface(modelType, typeof(ICollection<>));
            if (collectionType != null)
            {
                var elementType = collectionType.GenericTypeArguments[0];
                var elementBinder = context.CreateBinder(context.MetadataProvider.GetMetadataForType(elementType));

                var binderType = typeof(AltinnCoreCollectionModelBinder<>).MakeGenericType(collectionType.GenericTypeArguments);
                return (IModelBinder)Activator.CreateInstance(binderType, elementBinder);
            }

            return null;
        }
    }
}
