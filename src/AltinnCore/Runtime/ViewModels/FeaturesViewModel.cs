﻿using System.Collections.Generic;
using Microsoft.CodeAnalysis;
using TypeInfo = System.Reflection.TypeInfo;

namespace AltinnCore.Runtime.ViewModels
{
    public class FeaturesViewModel
    {
        public List<TypeInfo> Controllers { get; set; }

        public List<MetadataReference> MetadataReferences { get; set; }

        public List<TypeInfo> TagHelpers { get; set; }

        public List<TypeInfo> ViewComponents { get; set; }
    }
 }
