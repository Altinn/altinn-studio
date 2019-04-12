using System.Threading.Tasks;
using AltinnCore.Common.Helpers;
using AltinnCore.ServiceLibrary.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace AltinnCore.Designer.TagHelpers
{
    /// <summary>
    /// button tag helper
    /// </summary>
    [HtmlTargetElement("button", Attributes = AltinnTextAttributeName)]
    public class ButtonTagHelper : TagHelper
    {
        private const string AltinnTextAttributeName = "altinn-text";

        /// <summary>
        /// Initializes a new instance of the <see cref="ButtonTagHelper"/> class.
        /// </summary>
        /// <param name="generator">The current html generator</param>
        public ButtonTagHelper(IHtmlGenerator generator)
        {
            Generator = generator;
        }

        /// <summary>
        /// Gets the ordering index
        /// </summary>
        public override int Order
        {
            get
            {
                return -1000;
            }
        }

        /// <summary>
        /// Gets or sets the resource text key to use when replacing content
        /// </summary>
        [HtmlAttributeName(AltinnTextAttributeName)]
        public string AltinnText { get; set; }

        /// <summary>
        /// Gets or sets the current view context (injected)
        /// </summary>
        [HtmlAttributeNotBound]
        [ViewContext]
        public ViewContext ViewContext { get; set; }

        /// <summary>
        /// Gets the current html generator
        /// </summary>
        protected IHtmlGenerator Generator { get; }

        /// <summary>
        /// Method which processes the element and updates the content
        /// if all conditions are met and the given parameters are valid
        /// </summary>
        /// <param name="context">The current tag helper context</param>
        /// <param name="output">The output of this tag helper, the result is written here</param>
        /// <returns>Task indicating when the processing is completed</returns>
        public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
        {
            var childContent = await output.GetChildContentAsync();
            ServiceContext serviceContext = ViewContext.ViewBag.ServiceContext;
            RequestContext requestContext = ViewContext.ViewBag.RequestContext;

            if (!string.IsNullOrEmpty(AltinnText))
            {
                if (serviceContext.ServiceText.ContainsKey(AltinnText)
                    && serviceContext.ServiceText[AltinnText].ContainsKey(serviceContext.CurrentCulture))
                {
                    output.Content.SetHtmlContent(ServiceTextHelper.SetTextParams(serviceContext.ServiceText[AltinnText][serviceContext.CurrentCulture], requestContext, serviceContext));
                }
            }
        }
    }
}
