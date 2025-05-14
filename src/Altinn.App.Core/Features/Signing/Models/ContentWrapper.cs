using Altinn.App.Core.Features.Correspondence.Models;

namespace Altinn.App.Core.Features.Signing.Models;

internal record ContentWrapper
{
    internal required CorrespondenceContent CorrespondenceContent { get; init; }
    internal string? SmsBody { get; init; }
    internal string? EmailBody { get; init; }
    internal string? EmailSubject { get; init; }
}
