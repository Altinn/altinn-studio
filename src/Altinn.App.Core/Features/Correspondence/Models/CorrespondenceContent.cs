using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// The message content in a correspondence.
/// </summary>
public sealed record CorrespondenceContent : MultipartCorrespondenceItem
{
    /// <summary>
    /// The correspondence message title (subject).
    /// </summary>
    public required string Title { get; init; }

    /// <summary>
    /// The language of the correspondence, specified according to ISO 639-1.
    /// </summary>
    public required LanguageCode<Iso6391> Language { get; init; }

    /// <summary>
    /// The summary text of the correspondence message.
    /// </summary>
    public required string Summary { get; init; }

    /// <summary>
    /// The full text (body) of the correspondence message.
    /// </summary>
    public required string Body { get; init; }

    /// <summary>
    /// File attachments to associate with this correspondence.
    /// </summary>
    public IReadOnlyList<CorrespondenceAttachment>? Attachments { get; init; }

    internal void Serialise(MultipartFormDataContent content)
    {
        AddRequired(content, Language.Value, "Correspondence.Content.Language");
        AddRequired(content, Title, "Correspondence.Content.MessageTitle");
        AddRequired(content, Summary, "Correspondence.Content.MessageSummary");
        AddRequired(content, Body, "Correspondence.Content.MessageBody");
        SerializeAttachmentItems(content, Attachments);
    }
}
