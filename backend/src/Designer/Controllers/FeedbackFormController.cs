using System;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing actions related to feedback form
/// </summary>
[Authorize]
[ApiController]
[ValidateAntiForgeryToken]
[Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/feedbackform")]
public class FeedbackFormController: ControllerBase
{
    private readonly ISlackClient _slackClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="FeedbackFormController"/> class.
    /// </summary>
    /// <param name="slackClient">A http client to send messages to slack</param>
    public FeedbackFormController(ISlackClient slackClient)
    {
        _slackClient = slackClient;
    }

    /// <summary>
    /// Endpoint for submitting feedback
    /// </summary>
    [HttpPost]
    [Route("submit")]
    public async Task<IActionResult> SubmitFeedback([FromRoute] string org, [FromRoute] string app, [FromBody] FeedbackForm feedback)
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
            feedback.Answers.Add("env", GetEnvironmentName());
        }

        Console.WriteLine(JsonSerializer.Serialize(feedback, new JsonSerializerOptions { WriteIndented = true }));

        await _slackClient.SendMessage(new SlackRequest
        {
            Text = JsonSerializer.Serialize(feedback, new JsonSerializerOptions { WriteIndented = true })
        });

        return Ok();
    }

    private string GetEnvironmentName()
    {
        string hostname = Environment.GetEnvironmentVariable("GeneralSettings:HostName");
        if (hostname == null)
        {
            return "local";
        }
        if (hostname.StartsWith("dev")) {
            return "dev";
        }
        if (hostname.StartsWith("staging")) {
            return "staging";
        }
        if (hostname.Equals("altinn.studio")) {
            return "prod";
        }

        return "local";
    }
}
