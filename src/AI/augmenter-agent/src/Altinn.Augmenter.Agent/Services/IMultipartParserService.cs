using Altinn.Augmenter.Agent.Models;

namespace Altinn.Augmenter.Agent.Services;

public interface IMultipartParserService
{
    Task<ParsedFormData> ParseAsync(HttpRequest request);
}
