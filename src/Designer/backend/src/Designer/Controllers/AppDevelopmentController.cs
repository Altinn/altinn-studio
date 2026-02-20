#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Mappers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using IRepository = Altinn.Studio.Designer.Services.Interfaces.IRepository;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions that concerns app-development
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/app-development")]
    public class AppDevelopmentController : Controller
    {
        private readonly IAppDevelopmentService _appDevelopmentService;
        private readonly IRepository _repository;
        private readonly ISourceControl _sourceControl;
        private readonly ILayoutService _layoutService;
        private readonly IMediator _mediator;


        /// <summary>
        /// Initializes a new instance of the <see cref="AppDevelopmentController"/> class.
        /// </summary>
        /// <param name="appDevelopmentService">The app development service</param>
        /// <param name="repositoryService">The application repository service</param>
        /// <param name="sourceControl">The source control service.</param>
        /// <param name="layoutService">An <see cref="ILayoutService"/></param>
        /// <param name="mediator"></param>
        public AppDevelopmentController(IAppDevelopmentService appDevelopmentService, IRepository repositoryService, ISourceControl sourceControl, ILayoutService layoutService, IMediator mediator)
        {
            _appDevelopmentService = appDevelopmentService;
            _repository = repositoryService;
            _sourceControl = sourceControl;
            _layoutService = layoutService;
            _mediator = mediator;
        }

        /// <summary>
        /// Get all form layouts
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layout set to get layouts for</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("form-layouts")]
        public async Task<IActionResult> GetFormLayouts(string org, string app, [FromQuery] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                Dictionary<string, JsonNode> formLayouts = await _appDevelopmentService.GetFormLayouts(editingContext, layoutSetName, cancellationToken);
                return Ok(formLayouts);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest(exception.Message);
            }
        }

        /// <summary>
        /// Save form layout as JSON
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layoutSet the specific layout belongs to</param>
        /// <param name="layoutName">The name of the form layout to be saved.</param>
        /// <param name="formLayoutPayload">A json object with, layout, the content to be saved, and the componentIdsChange: If componentIDs have been changed, this event includes info to perform the change across the app</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("form-layout/{layoutName}")]
        public async Task<ActionResult> SaveFormLayout(string org, string app, [FromQuery] string layoutSetName, [FromRoute] string layoutName, [FromBody] FormLayoutPayload formLayoutPayload, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                Dictionary<string, JsonNode> formLayouts = await _appDevelopmentService.GetFormLayouts(editingContext, layoutSetName, cancellationToken);
                await _appDevelopmentService.SaveFormLayout(editingContext, layoutSetName, layoutName, formLayoutPayload.Layout, cancellationToken);

                if (formLayoutPayload.ComponentIdsChange is not null && !string.IsNullOrEmpty(layoutSetName))
                {
                    foreach (var componentIdChange in formLayoutPayload.ComponentIdsChange.Where((componentIdChange) => componentIdChange.OldComponentId != componentIdChange.NewComponentId))
                    {
                        if (componentIdChange.NewComponentId == null)
                        {
                            await _mediator.Publish(new ComponentDeletedEvent
                            {
                                ComponentId = componentIdChange.OldComponentId,
                                LayoutSetName = layoutSetName,
                                EditingContext = editingContext
                            }, cancellationToken);
                        }
                        await _mediator.Publish(new ComponentIdChangedEvent
                        {
                            OldComponentId = componentIdChange.OldComponentId,
                            NewComponentId = componentIdChange.NewComponentId,
                            LayoutSetName = layoutSetName,
                            EditingContext = editingContext
                        }, cancellationToken);
                    }
                }
                if (!formLayouts.ContainsKey(layoutName))
                {
                    LayoutSetConfig layoutSetConfig = await _appDevelopmentService.GetLayoutSetConfig(editingContext, layoutSetName, cancellationToken);
                    await _mediator.Publish(new LayoutPageAddedEvent
                    {
                        LayoutSetConfig = layoutSetConfig,
                        LayoutName = layoutName,
                        EditingContext = editingContext,
                    }, cancellationToken);
                }
                return Ok();
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Delete a form layout
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">The name of the layout set the specific layout belongs to</param>
        /// <param name="layoutName">The form layout to be deleted</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpDelete]
        [Route("form-layout/{layoutName}")]
        public async Task<ActionResult> DeleteFormLayout(string org, string app, [FromQuery] string layoutSetName, [FromRoute] string layoutName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

                await _mediator.Publish(new LayoutPageDeletedEvent
                {
                    EditingContext = editingContext,
                    LayoutSetName = layoutSetName,
                    LayoutName = layoutName,
                }, cancellationToken);

                _appDevelopmentService.DeleteFormLayout(editingContext, layoutSetName, layoutName);

                return Ok();
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Update a form layout name
        /// </summary>
        /// <param name="newName">The new name of the form layout.</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layout set the specific layout belongs to</param>
        /// <param name="layoutName">The current name of the form layout</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("form-layout-name/{layoutName}")]
        public async Task<ActionResult> UpdateFormLayoutName(string org, string app, [FromQuery] string layoutSetName, [FromRoute] string layoutName, [FromBody] string newName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                _appDevelopmentService.UpdateFormLayoutName(editingContext, layoutSetName, layoutName, newName);
                await _mediator.Publish(new LayoutPageIdChangedEvent
                {
                    EditingContext = editingContext,
                    LayoutSetName = layoutSetName,
                    LayoutName = layoutName,
                    NewLayoutName = newName,
                }, cancellationToken);
                return Ok();
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Saves the layout settings for an app without layout sets
        /// </summary>
        /// <param name="layoutSetName">Name of the layout set the layout settings belong to</param>
        /// <param name="layoutSettings">The data to be saved</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("layout-settings")]
        public async Task<ActionResult> SaveLayoutSettings(string org, string app, [FromQuery] string layoutSetName, [FromBody] JsonNode layoutSettings, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            try
            {
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                await _appDevelopmentService.SaveLayoutSettings(editingContext, layoutSettings, layoutSetName, cancellationToken);
                return Ok();
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Gets the layout settings for an app without layoutSets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layout set the specific layout settings belong to</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The content of the settings file</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("layout-settings")]
        public async Task<IActionResult> GetLayoutSettings(string org, string app, [FromQuery] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                var layoutSettings = await _appDevelopmentService.GetLayoutSettings(editingContext, layoutSetName, cancellationToken);
                return Ok(layoutSettings);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest(exception);
            }
        }

        /// <summary>
        /// Get all names of layouts across layoutSets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        /// <returns>A string array of all layout names without file extension in all sets</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("layout-names")]
        public async Task<IActionResult> GetLayoutNames(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            string[] layoutNames = await _appDevelopmentService.GetLayoutNames(editingContext, cancellationToken);
            return Ok(layoutNames);
        }

        /// <summary>
        /// Gets a list of all data model IDs present in application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="onlyUnReferenced">If true only model IDs without task_id ref in app metadata is returned</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns></returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("model-ids")]
        public async Task<IActionResult> GetAppMetadataDataModelIds(string org, string app, CancellationToken cancellationToken, [FromQuery] bool onlyUnReferenced = false)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            IEnumerable<string> dataModelIds = await _appDevelopmentService.GetAppMetadataModelIds(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), onlyUnReferenced, cancellationToken);
            return Ok(dataModelIds);
        }

        /// <summary>
        /// Return JSON presentation of the model
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of current layoutSet in ux-editor that edited layout belongs to</param>
        /// <param name="dataModelName">Name of data model to fetch</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model as JSON</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("model-metadata")]
        public async Task<IActionResult> GetModelMetadata(string org, string app, [FromQuery] string layoutSetName, [FromQuery] string dataModelName, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            ModelMetadata modelMetadata = await _appDevelopmentService.GetModelMetadata(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), layoutSetName, dataModelName, cancellationToken);

            return Ok(modelMetadata);
        }

        /// <summary>
        /// Get all layout sets in the layout-set.json file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is canceled.</param>
        /// <returns>The layout-sets.json</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("layout-sets")]
        public async Task<IActionResult> GetLayoutSets(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            LayoutSets layoutSets = await _appDevelopmentService.GetLayoutSets(editingContext, cancellationToken);
            return Ok(layoutSets);
        }

        [HttpGet("layout-sets/extended")]
        [UseSystemTextJson]
        public async Task<IEnumerable<LayoutSetDto>> GetLayoutSetsExtended(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            LayoutSetsModel layoutSetsModel = await _appDevelopmentService.GetLayoutSetsExtended(editingContext, cancellationToken);

            IEnumerable<LayoutSetDto> layoutSetDtoList = await Task.WhenAll(layoutSetsModel.Sets.Select(async (layoutSet) =>
            {
                LayoutSetDto layoutSetDto = layoutSet.ToDto();
                string layoutSetId = layoutSet?.Id;
                LayoutSettings layoutSettings = await _layoutService.GetLayoutSettings(
                    editingContext,
                    layoutSetId
                );
                PagesDto pages = PagesDto.From(layoutSettings);
                layoutSetDto.PageCount = pages.Groups != null ? pages.Groups.Sum(group => group.Pages.Count) : pages.Pages.Count;

                return layoutSetDto;
            }));
            return layoutSetDtoList;
        }

        /// <summary>
        /// Add a new layout set
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetPayload">Includes the connected taskType and the actual config needed for the layout set to be added to layout-sets.json.</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [HttpPost]
        [UseSystemTextJson]
        [Route("layout-set/{layoutSetIdToUpdate}")]
        public async Task<ActionResult> AddLayoutSet(string org, string app, [FromBody] LayoutSetPayload layoutSetPayload, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            LayoutSets layoutSets = await _appDevelopmentService.AddLayoutSet(editingContext, layoutSetPayload.LayoutSetConfig, layoutSetPayload.TaskType, cancellationToken);
            await _mediator.Publish(new LayoutSetCreatedEvent
            {
                EditingContext = editingContext,
                LayoutSet = layoutSetPayload.LayoutSetConfig
            }, cancellationToken);
            return Ok(layoutSets);
        }

        /// <summary>
        /// Updates the layout set name for an existing layout set
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetIdToUpdate">The layout set id to update</param>
        /// <param name="newLayoutSetName">The new id for the layout set</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [HttpPut]
        [UseSystemTextJson]
        [Route("layout-set/{layoutSetIdToUpdate}")]
        public async Task<ActionResult> UpdateLayoutSetName(string org, string app, [FromRoute] string layoutSetIdToUpdate, [FromBody] string newLayoutSetName, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            LayoutSets layoutSets = await _appDevelopmentService.UpdateLayoutSetName(editingContext, layoutSetIdToUpdate, newLayoutSetName, cancellationToken);
            await _mediator.Publish(new LayoutSetIdChangedEvent
            {
                EditingContext = editingContext,
                LayoutSetName = layoutSetIdToUpdate,
                NewLayoutSetName = newLayoutSetName,
            }, cancellationToken);
            return Ok(layoutSets);
        }

        /// <summary>
        /// Delete an existing layout set
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetIdToUpdate">The id of the layout set to delete</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        [HttpDelete]
        [UseSystemTextJson]
        [Route("layout-set/{layoutSetIdToUpdate}")]
        public async Task<ActionResult> DeleteLayoutSet(string org, string app, [FromRoute] string layoutSetIdToUpdate, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            await _mediator.Publish(new LayoutSetDeletedEvent
            {
                EditingContext = editingContext,
                LayoutSetName = layoutSetIdToUpdate
            }, cancellationToken);

            LayoutSets layoutSets = await _appDevelopmentService.DeleteLayoutSet(editingContext, layoutSetIdToUpdate, cancellationToken);

            return Ok(layoutSets);
        }

        /// <summary>
        /// Get rule handler in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layout set the specific rule handler belong to</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("rule-handler")]
        public async Task<IActionResult> GetRuleHandler(string org, string app, [FromQuery] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                string ruleHandler = await _appDevelopmentService.GetRuleHandler(editingContext, layoutSetName, cancellationToken);
                return Content(ruleHandler);
            }
            catch (FileNotFoundException)
            {
                return NoContent();
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest($"Could not get rule handler: {exception}");
            }
        }

        /// <summary>
        /// Save rule handler in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layout set the specific rule handler belong to</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpPost]
        [Route("rule-handler")]
        public async Task<IActionResult> SaveRuleHandler(string org, string app, [FromQuery] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                using (StreamReader reader = new(Request.Body))
                {
                    var content = await reader.ReadToEndAsync(cancellationToken);
                    var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                    await _appDevelopmentService.SaveRuleHandler(editingContext, content, layoutSetName, cancellationToken);
                }

                return NoContent();
            }
            catch (IOException)
            {
                return BadRequest("Could not save rule handler");
            }
        }

        /// <summary>
        /// Save rule configuration
        /// </summary>
        /// <param name="ruleConfig">The code list data to save</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("rule-config")]
        public async Task<IActionResult> SaveRuleConfig(string org, string app, [FromBody] JsonNode ruleConfig, [FromQuery] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                await _appDevelopmentService.SaveRuleConfig(editingContext, ruleConfig, layoutSetName, cancellationToken);
                return Ok();
            }
            catch (Exception exception)
            {
                return BadRequest($"Rule configuration could not be saved: {exception}");
            }
        }

        /// <summary>
        /// Get rule configuration
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("rule-config")]
        public async Task<IActionResult> GetRuleConfig(string org, string app, [FromQuery] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
                string ruleConfig = await _appDevelopmentService.GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(editingContext, layoutSetName, cancellationToken);
                return Content(ruleConfig);
            }
            catch (FileNotFoundException)
            {
                // Return 204 because the file is not required to exist
                return NoContent();
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest($"Could not get rule configuration: {exception}");
            }
        }

        /// <summary>
        /// Gets widget settings for app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The widget settings for the app.</returns>
        [HttpGet]
        [Route("widget-settings")]
        public ActionResult GetWidgetSettings(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            string widgetSettings = _repository.GetWidgetSettings(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer));
            return Ok(widgetSettings);
        }

        [HttpGet("app-version")]
        public VersionResponse GetAppVersion(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            var backendVersion = _appDevelopmentService.GetAppLibVersion(editingContext);
            _appDevelopmentService.TryGetFrontendVersion(editingContext, out string frontendVersion);

            return new VersionResponse
            {
                BackendVersion = backendVersion,
                FrontendVersion = frontendVersion
            };
        }
    }
}
