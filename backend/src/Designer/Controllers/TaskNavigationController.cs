using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions that concerns task navigation
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/task-navigation")]
    public class TaskNavigationController : Controller
    {
        private readonly ITaskNavigationService _taskNavigationService;

        /// <summary>
        /// Initializes a new instance of the <see cref="TaskNavigationController"/> class.
        /// </summary>
        /// <param name="taskNavigationService">The task navigation service</param>
        public TaskNavigationController(ITaskNavigationService taskNavigationService)
        {
            _taskNavigationService = taskNavigationService;
        }

        /// <summary>
        /// Get task navigation
        /// </summary>
        /// <returns>The list of task navigation groups</returns>
        [HttpGet]
        [UseSystemTextJson]
        public async Task<List<TaskNavigationGroupDto>> GetTaskNavigation(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            List<TaskNavigationGroupDto> taskNavigationGroupList = await _taskNavigationService.GetTaskNavigation(editingContext, cancellationToken);
            return taskNavigationGroupList;
        }
    }
}
