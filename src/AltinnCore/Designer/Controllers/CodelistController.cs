using System.Collections.Generic;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to code lists
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    public class CodelistController : Controller
    {
        private readonly IRepository _repository;
        private readonly ISourceControl _sourceControl;

        /// <summary>
        /// Initializes a new instance of the <see cref="CodelistController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service</param>
        /// <param name="sourceControl">the source control</param>
        public CodelistController(IRepository repositoryService, ISourceControl sourceControl)
        {
            _repository = repositoryService;
            _sourceControl = sourceControl;
        }

        /// <summary>
        /// The default action for this controller. Returns a view which lists all code lists at the given level
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view which lists all code lists at the given level</returns>
        public IActionResult Index(string org, string app)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.Codelists = _repository.GetCodelists(org, app);

            if (!string.IsNullOrEmpty(org) && string.IsNullOrEmpty(app))
            {
                model.RepositoryContent = _sourceControl.Status(org, "codelists");
            }

            return View(model);
        }

        /// <summary>
        /// View Status for codelists
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <returns>The view</returns>
        public IActionResult Status(string org)
        {
            AltinnStudioViewModel model = new AltinnStudioViewModel();
            model.CommitInfo = new CommitInfo() { Org = org, Repository = "codelists" };

            if (!string.IsNullOrEmpty(org))
            {
                model.RepositoryContent = _sourceControl.Status(org, "codelists");
            }

            return View(model);
        }

        /// <summary>
        /// This method pushes changes to remote repository
        /// </summary>
        /// <param name="commitInfo">The commit info</param>
        /// <returns>Redirects back to the codelist front page</returns>
        [HttpPost]
        public IActionResult PushChanges(CommitInfo commitInfo)
        {
            _sourceControl.PushChangesForRepository(commitInfo);
            return RedirectToAction("index", new { commitInfo.Org });
        }

        /// <summary>
        /// Action for retrieving a specific code list as JSON
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>The contents of the code list identified by the given <paramref name="name"/> as JSON</returns>
        public IActionResult Get(string org, string app, string name)
        {
            string codeList = _repository.GetCodelist(org, app, name);
            if (string.IsNullOrEmpty(codeList))
            {
                // Try find the codelist at the organisation level
                codeList = _repository.GetCodelist(org, null, name);
            }

            if (string.IsNullOrEmpty(codeList))
            {
                return Json("{}");
            }

            return Content(codeList);
        }

        /// <summary>
        /// Action for displaying a view for editing or creating a code list.
        /// The code list itself is loaded once the page has been loaded
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the code list to edit (optional)</param>
        /// <returns>A view for editing the given code list</returns>
        public IActionResult Edit(string org, string app, string name)
        {
            ViewBag.CodelistName = name;

            return View();
        }

        /// <summary>
        /// Saves the given <paramref name="jsonData">code list</paramref>
        /// </summary>
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="name">The name of the code list</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public IActionResult Edit([FromBody] dynamic jsonData, string name, string org, string app)
        {
            ViewBag.CodelistName = name;
            _repository.SaveCodeList(org, app, name, jsonData.ToString());

            return Json(new
            {
                Success = true,
                Message = "Kodeliste lagret",
            });
        }

        /// <summary>
        /// Delete Code list file
        /// </summary>
        /// <param name="routeName">The service name for the mapRoute</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name on config</param>
        /// <returns>A redirect to the code list overview</returns>
        [HttpGet]
        public IActionResult Delete(string routeName, string org, string app, string name)
        {
            _repository.DeleteCodeList(org, app, name);

            return RedirectToRoute(
                routeName,
                new { action = "Index", controller = "Codelist", org, app });
        }

        /// <summary>
        /// Get code list
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The codelists as json</returns>
        [HttpGet]
        public IActionResult CodeLists(string org, string app)
        {
            List<CodeList> codeLists = new List<CodeList>();
            Dictionary<string, string> appCodeLists = _repository.GetCodelists(org, app);

            int index = 1;
            foreach (KeyValuePair<string, string> kvp in appCodeLists)
            {
                codeLists.Add(new CodeList() { CodeListName = kvp.Key, Id = index });
                index++;
            }

            Dictionary<string, string> ownerCodeLists = _repository.GetCodelists(org, null);
            foreach (KeyValuePair<string, string> kvp in ownerCodeLists)
            {
                codeLists.Add(new CodeList() { CodeListName = kvp.Key, Id = index });
                index++;
            }

            return Json(codeLists);
        }
    }
}
