using System.Text.Encodings.Web;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions related to feedback form
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="FeedbackFormController"/> class.
/// </remarks>
/// <param name="slackClient">A http client to send messages to slack</param>
/// <param name="generalSettings">the general settings</param>
[Authorize]
[ApiController]
[ValidateAntiForgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/feedbackform")]
public class FeedbackFormController(ISlackClient slackClient, GeneralSettings generalSettings) : ControllerBase
{
    private readonly ISlackClient _slackClient = slackClient;
    private readonly GeneralSettings _generalSettings = generalSettings;
    private static readonly JsonSerializerOptions s_jsonSerializerOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <summary>
    /// Endpoint for submitting feedback
    /// </summary>
    [HttpPost]
    [Route("submit")]
    public async Task<IActionResult> SubmitFeedback([FromRoute] string org, [FromRoute] string app, [FromBody] FeedbackForm feedback, CancellationToken cancellationToken)
    {
        if (feedback == null)
        {
            return BadRequest("Feedback object is null");
        }

        if (feedback.Answers == null || feedback.Answers.Count == 0)
        {
            return BadRequest("Feedback answers are null or empty");
        }

        if (!feedback.Answers.ContainsKey("org"))
        {
            feedback.Answers.Add("org", org);
        }

        if (!feedback.Answers.ContainsKey("app"))
        {
            feedback.Answers.Add("app", app);
        }

        if (!feedback.Answers.ContainsKey("env"))
        {
            feedback.Answers.Add("env", _generalSettings.HostName);
        }

        await _slackClient.SendMessage(new SlackRequest
        {
            Text = JsonSerializer.Serialize(feedback.Answers, s_jsonSerializerOptions),
        }, cancellationToken);

        return Ok();
    }
}
