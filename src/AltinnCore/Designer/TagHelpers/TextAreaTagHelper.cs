// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

using System;
using AltinnCore.Common.Helpers;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.TagHelpers;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace AltinnCore.Designer.TagHelpers
{
    /// <summary>
    /// <see cref="ITagHelper"/> implementation targeting &lt;textarea&gt; elements with an <c>asp-for</c> attribute.
    /// </summary>
    [HtmlTargetElement("textarea", Attributes = ForAttributeName)]
    public class TextAreaTagHelper : TagHelper
    {
        private const string ForAttributeName = "altinn-for";

        /// <summary>
        /// Initializes a new instance of the <see cref="TextAreaTagHelper"/> class.
        /// Creates a new <see cref="TextAreaTagHelper"/>.
        /// </summary>
        /// <param name="generator">The <see cref="IHtmlGenerator"/>.</param>
        public TextAreaTagHelper(IHtmlGenerator generator)
        {
            Generator = generator;
        }

        /// <inheritdoc />
        public override int Order
        {
            get
            {
                return -1000;
            }
        }

        /// <summary>
        /// Gets the html generator properties
        /// </summary>
        protected IHtmlGenerator Generator { get; }

        /// <summary>
        /// Gets or sets the view context
        /// </summary>
        [HtmlAttributeNotBound]
        [ViewContext]
        public ViewContext ViewContext { get; set; }

        /// <summary>
        /// An expression to be evaluated against the current model.
        /// </summary>
        [HtmlAttributeName(ForAttributeName)]
        public ModelExpression For { get; set; }

        /// <inheritdoc />
        /// <remarks>Does nothing if <see cref="For"/> is <c>null</c>.</remarks>
        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            if (context == null)
            {
                throw new ArgumentNullException(nameof(context));
            }

            if (output == null)
            {
                throw new ArgumentNullException(nameof(output));
            }

            var tagBuilder = Generator.GenerateTextArea(
                ViewContext,
                For.ModelExplorer,
                For.Name,
                rows: 0,
                columns: 0,
                htmlAttributes: null);

            if (tagBuilder != null)
            {
                ServiceContext serviceContext = ViewContext.ViewBag.ServiceContext;
                string modelPath = serviceContext.RootName + "." + ModelHelper.GetMetadataModelPath(For.Name);

                ElementMetadata elementData = null;
                if (serviceContext?.ServiceMetaData.Elements.ContainsKey(modelPath) == true)
                {
                    elementData = serviceContext.ServiceMetaData.Elements[modelPath];
                }

                if (elementData.IsReadOnly)
                {
                    output.Attributes.Add("disabled", null);
                }

                output.MergeAttributes(tagBuilder);
                if (tagBuilder.HasInnerHtml)
                {
                    // Overwrite current Content to ensure expression result round-trips correctly.
                    output.Content.SetHtmlContent(tagBuilder.InnerHtml);
                }

                ReplaceAttributeTextKeysWithText(output, serviceContext);
            }
        }

        /// <summary>
        /// This method replaces the error text key in validation attribute comming from model
        /// https://github.com/aspnet/Mvc/tree/a78f77afde003c4a3fcf5dd7b6dc13dd9c85f825/src/Microsoft.AspNetCore.Mvc.DataAnnotations/Internal
        /// and other attributes that uses altinn text key
        /// </summary>
        /// <param name="tagHelperOutput">the tag helper output</param>
        /// <param name="serviceContext">the service context</param>
        private void ReplaceAttributeTextKeysWithText(TagHelperOutput tagHelperOutput, ServiceContext serviceContext)
        {
            for (int i = 0; i < tagHelperOutput.Attributes.Count; i++)
            {
                string attributeKey = tagHelperOutput.Attributes[i].Name;

                // Look for the known jquery-validation-unobtrusive attribute tags
                if (attributeKey.Equals("data-val-equalto") ||
                    attributeKey.Equals("data-val-maxlength") ||
                    attributeKey.Equals("data-val-minlength") ||
                    attributeKey.Equals("data-val-range") ||
                    attributeKey.Equals("data-val-regex") ||
                    attributeKey.Equals("data-val-required") ||
                    attributeKey.Equals("data-val-length") ||
                    attributeKey.Equals("placeholder"))
                {
                    // Replaces the attribute
                    tagHelperOutput.Attributes[i] = new TagHelperAttribute(
                        tagHelperOutput.Attributes[i].Name,
                        ServiceTextHelper.GetServiceText(tagHelperOutput.Attributes[i].Value.ToString(), serviceContext.ServiceText, null, serviceContext.CurrentCulture));
                }
            }
        }
    }
}
