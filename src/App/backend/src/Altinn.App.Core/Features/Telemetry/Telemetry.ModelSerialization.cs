using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartSerializeToXmlActivity(Type typeToSerialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.SerializeXml");
        activity?.SetTag("altinn.data.model.type", typeToSerialize.FullName);
        return activity;
    }

    internal Activity? StartSerializeToJsonActivity(Type typeToSerialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.SerializeJson");
        activity?.SetTag("altinn.data.model.type", typeToSerialize.FullName);
        return activity;
    }

    internal Activity? StartDeserializeFromXmlActivity(Type typeToDeserialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.DeserializeXml");
        activity?.SetTag("altinn.data.model.type", typeToDeserialize.FullName);
        return activity;
    }

    internal Activity? StartDeserializeFromJsonActivity(Type typeToDeserialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.DeserializeJson");
        activity?.SetTag("altinn.data.model.type", typeToDeserialize.FullName);
        return activity;
    }
}
