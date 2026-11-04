namespace Altinn.Studio.Designer.Models.Dto;

public sealed class RestartRequest
{
    /// <summary>
    /// The environment to restart the app in, such as <c>tt02</c>.
    /// </summary>
    public required string Environment { get; init; }
}
