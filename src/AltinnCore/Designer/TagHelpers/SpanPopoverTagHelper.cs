using System.Threading.Tasks;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace AltinnCore.Designer.TagHelpers
{
    /// <summary>
    /// Tag helper which creates a popover for span elements which meets the conditions
    /// </summary>
    [HtmlTargetElement("span", Attributes = AltinnPopoverTitleTextKeyAttributeName)]
    [HtmlTargetElement("span", Attributes = AltinnPopoverContentTextKeyAttributeName)]
    public class SpanPopoverTagHelper : TagHelper
    {
        private const string AltinnPopoverTitleTextKeyAttributeName = "altinn-popover-title-text-key";
        private const string AltinnPopoverContentTextKeyAttributeName = "altinn-popover-content-text-key";

        /// <summary>
        /// Initializes a new instance of the <see cref="SpanPopoverTagHelper"/> class. 
        /// </summary>
        /// <param name="generator">The current html generator</param>
        public SpanPopoverTagHelper(IHtmlGenerator generator)
        {
            Generator = generator;
        }

        /// <summary>
        /// Gets the index of the element to use when ordering
        /// </summary>
        public override int Order
        {
            get
            {
                return -1000;
            }
        }

        /// <summary>
        /// Gets or sets the resource key to use for the title text in the popover
        /// </summary>
        [HtmlAttributeName(AltinnPopoverTitleTextKeyAttributeName)]
        public string AltinnPopoverTitleTextKey { get; set; }

        /// <summary>
        /// Gets or sets the resource key to use for the content in the popover
        /// </summary>
        [HtmlAttributeName(AltinnPopoverContentTextKeyAttributeName)]
        public string AltinnPopoverContentTextKey { get; set; }
        
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
        /// Processes the targeted element
        /// </summary>
        /// <param name="context">The current tag helper context</param>
        /// <param name="output">The output to write the result to</param>
        /// <returns>Task indication completion</returns>
        public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
        {
            var childContent = await output.GetChildContentAsync();

            ServiceContext serviceContext = ViewContext.ViewBag.ServiceContext;

            if (!string.IsNullOrEmpty(AltinnPopoverTitleTextKey))
            {
                if (serviceContext.ServiceText.ContainsKey(serviceContext.CurrentCulture)
                    && serviceContext.ServiceText[serviceContext.CurrentCulture].ContainsKey(AltinnPopoverTitleTextKey))
                {
                    output.Attributes.Add("title", serviceContext.ServiceText[serviceContext.CurrentCulture][AltinnPopoverTitleTextKey]);
                }
            }

            if (!string.IsNullOrEmpty(AltinnPopoverContentTextKey))
            {
                if (serviceContext.ServiceText.ContainsKey(serviceContext.CurrentCulture)
                    && serviceContext.ServiceText[serviceContext.CurrentCulture].ContainsKey(AltinnPopoverContentTextKey))
                {
                    output.Attributes.Add("data-content", serviceContext.ServiceText[serviceContext.CurrentCulture][AltinnPopoverContentTextKey]);
                }
            }

            output.Attributes.Add("data-toggle", "popover");
            output.Content.SetHtmlContent(childContent);
        }
    }
}
