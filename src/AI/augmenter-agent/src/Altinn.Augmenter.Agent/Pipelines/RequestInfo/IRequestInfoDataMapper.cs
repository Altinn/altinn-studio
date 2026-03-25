using System.Text.Json;

namespace Altinn.Augmenter.Agent.Pipelines.RequestInfo;

public interface IRequestInfoDataMapper
{
    JsonDocument MapToRequestInfo(JsonElement flatData);
}
