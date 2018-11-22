using System.Collections.Generic;
using Microsoft.CodeAnalysis;
using TypeInfo = System.Reflection.TypeInfo;

namespace AltinnCore.Runtime.ViewModels
{
    /// <summary>
    /// View model for features
    /// </summary>
    public class FeaturesViewModel
    {
        /// <summary>
        /// controller list
        /// </summary>
        public List<TypeInfo> Controllers { get; set; }

        /// <summary>
        /// meta data references
        /// </summary>
        public List<MetadataReference> MetadataReferences { get; set; }

        /// <summary>
        /// tag helpers
        /// </summary>
        public List<TypeInfo> TagHelpers { get; set; }

        /// <summary>
        /// view components
        /// </summary>
        public List<TypeInfo> ViewComponents { get; set; }
    }
 }
