using System.Diagnostics;

namespace Altinn.App.Core.Features;

partial class Telemetry
{
    internal Activity? StartSerializeToXmlActivity(Type typeToSerialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.SerializeXml");
        activity?.SetTag("Type", typeToSerialize.FullName);
        return activity;
    }

    internal Activity? StartSerializeToJsonActivity(Type typeToSerialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.SerializeJson");
        activity?.SetTag("Type", typeToSerialize.FullName);
        return activity;
    }

    internal Activity? StartDeserializeFromXmlActivity(Type typeToDeserialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.DeserializeXml");
        activity?.SetTag("Type", typeToDeserialize.FullName);
        return activity;
    }

    internal Activity? StartDeserializeFromJsonActivity(Type typeToDeserialize)
    {
        var activity = ActivitySource.StartActivity("SerializationService.DeserializeJson");
        activity?.SetTag("Type", typeToDeserialize.FullName);
        return activity;
    }
}
