using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Controllers
{
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app}/layouts/layoutSet/{layoutSetId}/")]
    public class LayoutController(ILayoutService layoutService) : Controller
    {
        [EndpointSummary("Retrieve pages")]
        [ProducesResponseType<PagesDto>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpGet("pages")]
        [UseSystemTextJson]
        public async Task<ActionResult<PagesDto>> GetPages(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
                editingContext,
                layoutSetId
            );
            PagesDto pages = PagesDto.From(layoutSettings);
            return Ok(pages);
        }

        [EndpointSummary("Create page")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [HttpPost("pages")]
        [UseSystemTextJson]
        public async Task<ActionResult<PageDto>> CreatePage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromBody] PageDto page
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
                editingContext,
                layoutSetId
            );
            if (layoutSettings.Pages is PagesWithOrder pages)
            {
                string existingPage = pages.Order.Find(p => p == page.Id);
                if (existingPage != null)
                {
                    return Conflict("Page already exists.");
                }
            }
            await layoutService.CreatePage(editingContext, layoutSetId, page.Id);
            return Created();
        }

        [EndpointSummary("Retrieve page")]
        [ProducesResponseType<PageDto>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpGet("pages/{pageId}")]
        [UseSystemTextJson]
        public async Task<ActionResult<PageDto>> GetPage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromRoute] string pageId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
                editingContext,
                layoutSetId
            );
            PagesDto pagesDto = PagesDto.From(layoutSettings);
            PageDto page = pagesDto.Pages.Find(p => p.Id == pageId);
            if (page == null)
            {
                return NotFound();
            }
            return Ok(page);
        }

        [EndpointSummary("Modify page")]
        [ProducesResponseType<PageDto>(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpPut("pages/{pageId}")]
        [UseSystemTextJson]
        public async Task<ActionResult<PageDto>> ModifyPage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromRoute] string pageId,
            [FromBody] PageDto page
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(editingContext, layoutSetId);
            PagesDto pagesDto = PagesDto.From(layoutSettings);

            PageDto existingPage =
                pagesDto.Groups?
                    .Where(g => g?.Pages != null)
                    .SelectMany(g => g.Pages)
                    .FirstOrDefault(p => p?.Id == pageId)
                ?? pagesDto.Pages?.FirstOrDefault(p => p?.Id == pageId);

            if (existingPage == null)
            {
                return NotFound();
            }

            await layoutService.RenamePage(editingContext, layoutSetId, pageId, page.Id);
            return Ok();
        }

        [EndpointSummary("Delete page")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [HttpDelete("pages/{pageId}")]
        [UseSystemTextJson]
        public async Task<ActionResult> DeletePage(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromRoute] string pageId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
                editingContext,
                layoutSetId
            );
            PagesDto pagesDto = PagesDto.From(layoutSettings);
            PageDto page = pagesDto.Pages.Find(p => p.Id == pageId);
            if (page == null)
            {
                return NotFound();
            }

            await layoutService.DeletePage(editingContext, layoutSetId, pageId);
            return Ok();
        }

        [EndpointSummary("Modify pages")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [HttpPut("pages")]
        [UseSystemTextJson]
        public async Task<ActionResult> ModifyPages(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromBody] PagesDto pages
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                app,
                developer
            );
            await layoutService.UpdatePageOrder(editingContext, layoutSetId, pages.ToBusiness());
            return Ok();
        }

        [EndpointSummary("Convert layout to use page groups")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [HttpPost("convert-to-pagegroups")]
        [UseSystemTextJson]
        public async Task<ActionResult> ConvertToPageGroups(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                app,
                developer
            );
            try
            {
                await layoutService.ConvertPagesToPageGroups(editingContext, layoutSetId);
            }
            catch (InvalidOperationException e)
            {
                return Conflict(e.Message);
            }
            return Ok();
        }

        [EndpointSummary("Convert layout to use page order")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [HttpPost("convert-to-pageorder")]
        [UseSystemTextJson]
        public async Task<ActionResult> ConvertToPageOrder(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                app,
                developer
            );
            try
            {
                await layoutService.ConvertPageGroupsToPages(editingContext, layoutSetId);
            }
            catch (InvalidOperationException e)
            {
                return Conflict(e.Message);
            }
            return Ok();
        }

        [EndpointSummary("Update pages")]
        [EndpointDescription(
            @"This endpoint should not be preferred over a more explicit endpoint.
            i.e. use `DeletePage` instead if possible."
        )]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [HttpPut("page-groups")]
        [UseSystemTextJson]
        public async Task<ActionResult> UpdatePageGroups(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string layoutSetId,
            [FromBody] PagesDto pages
        )
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);

            PagesWithGroups pagesWithGroups = pages.ToBusiness() as PagesWithGroups;
            await layoutService.UpdatePageGroups(editingContext, layoutSetId, pagesWithGroups);
            return Ok();
        }
    }
}
