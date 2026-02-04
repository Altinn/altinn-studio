using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<TaskType>))]
public enum TaskType
{
    Data,
    Confirmation,
    Feedback,
    Signing,
    Payment,
    Pdf
}
