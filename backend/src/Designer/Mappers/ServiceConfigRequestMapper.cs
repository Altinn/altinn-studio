using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Mappers;

public class ServiceConfigurationMapper
{
    public static void UpdateFromRequest(ServiceConfiguration target, ServiceConfigRequest source)
    {
        target.ServiceDescription = source.ServiceDescription;
        target.ServiceId = source.ServiceId;
        target.ServiceName = source.ServiceName;
        target.Homepage = source.Homepage;
        target.Status = source.Status;
        target.Visible = source.Visible;
        target.ContactPoints = source.ContactPoints;
        target.IsDelegable = source.IsDelegable;
        target.ResourceType = source.ResourceType;
        target.AvailableForType = source.AvailableForType;
        target.EnterpriseUserEnabled = source.EnterpriseUserEnabled;
        target.SelfIdentifiedUserEnabled = source.SelfIdentifiedUserEnabled;
    }
}
