using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;
using Microsoft.Extensions.DependencyInjection;

namespace AltinnCore.Designer.TagHelpers
{
    /// <summary>
    /// Extensions for the ViewContext class
    /// </summary>
    public static class ViewContextExtensions
    {
        /// <summary>
        /// Extension method which renders a given partial view (writes it to the current context)
        /// </summary>
        /// <param name="context">The current view context</param>
        /// <param name="viewName">The name of the partial view</param>
        /// <param name="viewEngine">The current view engine</param>
        /// <param name="viewResult">The view result</param>
        /// <returns>The rendered partial view</returns>
        public static async Task<string> RenderPartialView(this ViewContext context, string viewName, ICompositeViewEngine viewEngine = null, ViewEngineResult viewResult = null)
        {
            viewEngine = viewEngine ?? context.HttpContext.RequestServices.GetRequiredService<ICompositeViewEngine>();

            viewResult = viewResult ?? viewEngine.FindView(context, viewName, false);

            await viewResult.View.RenderAsync(context);

            return context.Writer.ToString();
        }
    }

    /// <summary>
    /// Tag helper which renders a given partial based on its name
    /// </summary>
    [HtmlTargetElement("partial", Attributes = "name")]
    public class PartialTagHelper : TagHelper
    {
        private readonly ICompositeViewEngine _viewEngine;
        
        /// <summary>
        /// Initializes a new instance of the <see cref="PartialTagHelper"/> class.
        /// </summary>
        /// <param name="viewEngine">The current view engine</param>
        public PartialTagHelper(ICompositeViewEngine viewEngine)
        {
            _viewEngine = viewEngine;
        }

        /// <summary>
        /// Gets or sets the current view context (injected)
        /// </summary>
        [ViewContext]
        public ViewContext ViewContext { get; set; }

        /// <summary>
        /// Gets or sets the name of the partial view to render
        /// </summary>
        [HtmlAttributeName("name")]
        public string Name { get; set; }
        
        /// <summary>
        /// Processes an element
        /// </summary>
        /// <param name="context">The current helper context</param>
        /// <param name="output">The output</param>
        public async override void Process(TagHelperContext context, TagHelperOutput output)
        {
            var sw = new StringWriter();

            // Create a new viewData (viewbag). This will be used in a new ViewContext to define the model we want
            ViewDataDictionary viewData = ViewContext.ViewData;

            // Generate a viewContext with our viewData
            var viewContext = new ViewContext(ViewContext, ViewContext.View, viewData, ViewContext.TempData, sw, new HtmlHelperOptions());

            // Use the viewContext to run the given ViewName
            output.Content.AppendHtml(await viewContext.RenderPartialView(Name));
        }
    }
}
