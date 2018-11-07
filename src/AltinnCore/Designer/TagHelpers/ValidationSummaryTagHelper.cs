using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Helpers;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace AltinnCore.Designer.TagHelpers
{
    /// <summary>
    /// Tag helper which renders the validation summary for a service
    /// </summary>
    [HtmlTargetElement("validationsummary")]
    public class ValidationSummaryTagHelper : TagHelper
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ValidationSummaryTagHelper"/> class.
        /// </summary>
        /// <param name="generator">The html generator</param>
        public ValidationSummaryTagHelper(IHtmlGenerator generator)
        {
            Generator = generator;
        }

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
        /// Builds the validation summary
        /// </summary>
        /// <param name="context">The current tag helper context</param>
        /// <param name="output">The output of the tag helper, is written to when creating the result</param>
        /// <returns>A task</returns>
        public override async Task ProcessAsync(TagHelperContext context, TagHelperOutput output)
        {
            output.TagName = "div";
            var childContent = await output.GetChildContentAsync();

            RequestContext requestContext = ViewContext.ViewBag.RequestContext;
            ServiceContext serviceContext = ViewContext.ViewBag.ServiceContext;

            if (requestContext != null && requestContext.ValidationResult != null)
            {
                int numberOfValidationErrors = requestContext.ValidationResult.Where(vs => vs.ValidationStatusType.Equals(ValidationStatusType.Error)).ToList().Count;

                if (numberOfValidationErrors > 0)
                {
                    output.Attributes.Add("class", "card card-inverse card-danger");
                    TagBuilder cardBlockTag = new TagBuilder("div");
                    cardBlockTag.AddCssClass("card-body");

                    TagBuilder cardTitleTag = new TagBuilder("h3");
                    cardTitleTag.InnerHtml.AppendHtml("Du har " + numberOfValidationErrors + " feil");
                    cardTitleTag.AddCssClass("card-title");
                    cardBlockTag.InnerHtml.AppendHtml(cardTitleTag);

                    TagBuilder listBuilder = new TagBuilder("ul");
                    listBuilder.AddCssClass("card-text");
                    foreach (ValidationResult validationResult in requestContext.ValidationResult.OrderBy(w => w.ValidationGroup))
                    {
                        TagBuilder errorListItem = new TagBuilder("li");
                        TagBuilder errorLink = new TagBuilder("a");

                        string url = "/ui/" + requestContext.InstanceId + "/" + validationResult.ViewID;
                        if (validationResult.CustomParameters != null && validationResult.CustomParameters.Count > 0)
                        {
                            url += "?";
                            string splitter = string.Empty;
                            foreach (KeyValuePair<string, string> kvp in validationResult.CustomParameters)
                            {
                                url += splitter;
                                url += kvp.Key + "=" + kvp.Value;
                                splitter = "&";
                            }

                            url += '#' + validationResult.ModelKey.Replace('.', '_').Replace("[", "_").Replace("]", "_");
                        }

                        errorLink.Attributes.Add("href", url);
                        errorLink.InnerHtml.AppendHtml(ServiceTextHelper.SetTextParams(ServiceTextHelper.GetServiceText(validationResult.ValidationMessageKey, serviceContext.ServiceText, validationResult.MessageParams, serviceContext.CurrentCulture), requestContext, serviceContext));

                        errorListItem.InnerHtml.AppendHtml(errorLink);
                        listBuilder.InnerHtml.AppendHtml(errorListItem);
                    }

                    cardBlockTag.InnerHtml.AppendHtml(listBuilder);
                    output.Content.AppendHtml(cardBlockTag);
                }
                else
                {
                    output.Attributes.Add("class", "card card-inverse card-success");
                }
            }
            else
            {
                output.Content.Clear();
            }
        }
    }
}
