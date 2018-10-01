using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace AltinnCore.Designer.TagHelpers
{
    /// <summary>
    /// Tag helper which populates values based on a service model
    /// </summary>
    [HtmlTargetElement("span", Attributes = ForAttributeName)]
    public class SpanForModelValueTagHelper : TagHelper
    {
        private const string AltinnTextKeyAttributeName = "altinn-text";

        private const string ForAttributeName = "altinn-for";

        /// <summary>
        /// Initializes a new instance of the <see cref="SpanForModelValueTagHelper"/> class.
        /// </summary>
        /// <param name="generator">The current html generator</param>
        public SpanForModelValueTagHelper(IHtmlGenerator generator)
        {
            Generator = generator;
        }
        
        /// <summary>
        /// Gets the order
        /// </summary>
        public override int Order
        {
            get
            {
                return -1000;
            }
        }
        
        /// <summary>
        /// Gets or sets an expression to be evaluated against the current model.
        /// </summary>
        [HtmlAttributeName(ForAttributeName)]
        public ModelExpression For { get; set; }
        
        /// <summary>
        /// Gets or sets the key for the text to use
        /// </summary>
        [HtmlAttributeName(AltinnTextKeyAttributeName)]
        public string AltinnTextKey { get; set; }
        
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

        #pragma warning disable CS1998 // Async method lacks 'await' operators and will run synchronously
        /// <summary>
        /// Processes an element, and replaces the content if the conditions are met
        /// </summary>
        /// <param name="context">The current tag helper context</param>
        /// <param name="output">The output which is written to</param>
        /// <returns>A task</returns>
        public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
        #pragma warning restore CS1998 // Async method lacks 'await' operators and will run synchronously
        {
            var modelExplorer = For.ModelExplorer;

            if (modelExplorer != null && modelExplorer.Model != null)
            {
                output.Content.SetHtmlContent(modelExplorer.Model.ToString());
            }
        }
    }
}
