using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;

using AltinnCore.Common.Constants;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using HtmlAgilityPack;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// The controller responsible for functionality related to the service Views
    /// </summary>
    public class UIController : Controller
    {
        private readonly IRepository _repository;
        private readonly IViewRepository _viewRepository;

        /// <summary>
        /// Initializes a new instance of the <see cref="UIController"/> class
        /// </summary>
        /// <param name="repositoryService">The ServiceRepositoryService</param>
        /// <param name="viewRepositoryService">The view repository</param>
        public UIController(IRepository repositoryService, IViewRepository viewRepositoryService)
        {
            _repository = repositoryService;
            _viewRepository = viewRepositoryService;
        }

        /// <summary>
        /// List of views
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The Views</returns>
        public ActionResult Index(string org, string service, string edition)
        {
            IList<ViewMetadata> views = _viewRepository.GetViews(org, service, edition);

            if (Request.Headers["accept"].ToString().Contains("application/json"))
            {
                return Json(views);
            }

            return View(views);
        }

        /// <summary>
        /// Action for editing a RazorView
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">The ViewName</param>
        /// <returns>The View</returns>
        public ActionResult Edit(string org, string service, string edition, string id)
        {
            string data = _viewRepository.GetView(org, service, edition, id);
            return View(data as object);
        }

        /// <summary>
        /// Reorder the list of view metadata.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="viewOrder">View order as comma-seperated list</param>
        /// <returns>The <see cref="IActionResult"/>.</returns>
        public IActionResult Reorder(string org, string service, string edition, string viewOrder)
        {
            if (string.IsNullOrWhiteSpace(viewOrder) || !Regex.IsMatch(viewOrder, @"(\w,?)+"))
            {
                return StatusCode((int)HttpStatusCode.NotAcceptable, "viewOrder må være kommaseparert liste av tall.");
            }

            var viewOrderArray = ToIntArray(viewOrder).ToArray();
            _viewRepository.RearrangeViews(org, service, edition, viewOrderArray);

            return Ok();
        }

        /// <summary>
        /// The move dialog.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>Partial view with modal dialog for moving views.</returns>
        public IActionResult MoveDialog(string org, string service, string edition)
        {
            IList<ViewMetadata> views = _viewRepository.GetViews(org, service, edition);
            return PartialView(views);
        }

        /// <summary>
        /// Action for editing the name of a view
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="currentName">The name of the view</param>
        /// <param name="newName">The new name for the view</param>
        /// <returns>The view</returns>
        [HttpPost]
        public IActionResult EditViewName(string org, string service, string edition, string currentName, string newName)
        {
            if (string.IsNullOrWhiteSpace(currentName) || string.IsNullOrWhiteSpace(newName))
            {
                return StatusCode(400, "Input missing");
            }

            if (currentName.Equals(newName, StringComparison.CurrentCultureIgnoreCase))
            {
                return StatusCode(400, $"Ingen endring. Både nytt og gammelt navn er \"{currentName}\"");
            }

            const string nameRegex = @"^[a-zA-Z][a-zA-Z0-9_\-]{2,30}$";
            var match = Regex.Match(newName, nameRegex, RegexOptions.IgnoreCase);
            if (!match.Success)
            {
                return StatusCode(400, "Minst 3 tegn, kan ikke inneholde mellomrom eller spesialtegn ('-' er tillatt)");
            }

            bool updated = _viewRepository.UpdateViewName(org, service, edition, currentName, newName);
            if (updated)
            {
                _repository.UpdateViewNameTextResource(org, service, edition, currentName, newName);
            }

            return Ok();
        }

        /// <summary>
        /// Action for deleting a RazorView
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">The name of the view</param>
        /// <returns>The View</returns>
        public ActionResult Delete(string org, string service, string edition, string id)
        {
            bool deleted = _viewRepository.DeleteView(org, service, edition, id);
            if (deleted)
            {
                _repository.DeleteTextResource(org, service, edition, id);
            }

            return RedirectToAction("Index");
        }

        /// <summary>
        /// Action for creating a new RazorView for a service edition
        /// </summary>
        /// <returns>The View</returns>
        [HttpGet]
        public ActionResult Create()
        {
            return View();
        }

        /// <summary>
        /// Action to create RazorView
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="view">The ViewName</param>
        /// <returns>The View</returns>
        [HttpPost]
        public ActionResult Create(string org, string service, string edition, ViewMetadata view)
        {
            if (!ModelState.IsValid)
            {
                return View(view);
            }

            bool viewCreated = _viewRepository.CreateView(org, service, edition, view);

            if (viewCreated)
            {
                Save(org, service, edition, view.Name, string.Empty);
                IList<ViewMetadata> allViewsMetadata = _viewRepository.GetViews(org, service, edition);
                _repository.AddViewNameTextResource(org, service, edition, allViewsMetadata);

                return RedirectToAction("Edit", new { org, service, edition, id = view.Name });
            }

            ViewBag.viewNameAlreadyExists = true;
            return View();
        }

        /// <summary>
        /// Action to present the metadata 
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="viewName">The ViewName</param>
        /// <returns>The View</returns>
        public IActionResult Metadata(string org, string service, string edition, string viewName)
        {
            var viewMetadata = _viewRepository.GetView(org, service, edition, viewName);
            if (viewMetadata == null)
            {
                return NotFound();
            }

            return Json(viewMetadata);
        }

        /// <summary>
        /// Method to save a View
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">Name on view</param>
        /// <param name="html">The html/Razor code of the View</param>
        /// <returns>The result</returns>
        [HttpPost]
        public ActionResult Save(string org, string service, string edition, string id, string html)
        {
            if (string.IsNullOrEmpty(id))
            {
                return BadRequest("Id is required");
            }

            if (string.IsNullOrWhiteSpace(html))
            {
                html = "<form class=\"droppable sortable clearfix control-target ui-droppable ui-sortable\">";
                html = html.Replace(html, "<form asp-controller=\"instance\" asp-action=\"edit\" class=\"droppable sortable clearfix control-target ui-droppable ui-sortable\"></form>");
            }
            else
            {
                html = html.Replace(
               "<form class=\"droppable sortable clearfix control-target ui-droppable ui-sortable\">",
               "<form asp-controller=\"instance\" asp-action=\"edit\" class=\"droppable sortable clearfix control-target ui-droppable ui-sortable\">");
            }

            _viewRepository.SaveView(org, service, edition, id, html);

            HtmlDocument doc = new HtmlDocument();
            doc.LoadHtml(html);

            foreach (HtmlNode node in doc.DocumentNode.Descendants().Where(r => r.Attributes.Any(x => x.Name == "altinn-group-binding")))
            {
                string target = node.GetAttributeValue("altinn-group-binding", string.Empty);
                string indexName = node.GetAttributeValue("altinn-group-index-name", string.Empty);
                string indexParamName = node.GetAttributeValue("altinn-group-index-param-name", string.Empty);

                if (string.IsNullOrEmpty(indexName))
                {
                    string indexParamVariable =
                        "@{ int " + indexParamName + " = 0; try { " + indexParamName + " = Convert.ToInt32(ViewBag.RequestContext.Params[\"" + indexParamName + "\"]); } catch { } }";
                    node.InnerHtml = indexParamVariable + node.InnerHtml;
                    if (!string.IsNullOrEmpty(target))
                    {
                        //throw new Exception();
                    }
                }
                else
                {
                    string forLoop = "@for (int " + indexName + " = 0; " + indexName + " %LT% Model." + target + ".Count; " + indexName + "++) {";
                    node.InnerHtml = forLoop + node.InnerHtml + " } ";
                    if (!string.IsNullOrEmpty(target))
                    {
                        //throw new Exception();
                    }
                }
            }

            // Find HtmlNodes with resource texts
            foreach (HtmlNode htmlNode in doc.DocumentNode.Descendants().Where(n => n.Attributes.Any(x => x.Name == "altinn-text")))
            {
                if (!htmlNode.InnerHtml.Contains("altinn-text-template"))
                {
                    htmlNode.InnerHtml = "";
                }
            }

            ServiceMetadata metadata = _repository.GetServiceMetaData(org, service, edition);
            string rootName = metadata.Elements.Values.First(e => e.ParentElement == null).TypeName;
            _viewRepository.SaveView(
                            org,
                            service,
                            edition,
                            id + "final",
                            "@model " + string.Format(CodeGeneration.ServiceNamespaceTemplate, org, service, edition) + "." + rootName + "\n\n" + doc.DocumentNode.InnerHtml.Replace(" %LT%", "<"));

            return Ok();
        }

        private static IEnumerable<int> ToIntArray(string s)
        {
            if (string.IsNullOrWhiteSpace(s))
            {
                yield break;
            }

            var items = s.Split(", ".ToCharArray(), StringSplitOptions.RemoveEmptyEntries);
            foreach (var item in items)
            {
                if (int.TryParse(item, out int tmp))
                {
                    yield return tmp;
                }
            }
        }
    }
}
