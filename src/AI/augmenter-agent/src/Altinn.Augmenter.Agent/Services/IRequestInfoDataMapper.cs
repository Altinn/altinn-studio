using System.Text.Json;

namespace Altinn.Augmenter.Agent.Services;

public interface IRequestInfoDataMapper
{
    JsonDocument MapToRequestInfo(JsonElement flatData);
}
