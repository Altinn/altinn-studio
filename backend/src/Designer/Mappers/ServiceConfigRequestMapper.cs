using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Mappers;

public class ServiceConfigurationMapper
{
    public static void UpdateFromRequest(ServiceConfiguration target, ServiceConfigRequest source)
    {
        target.Description = source.Description;
        target.ServiceId = source.ServiceId;
        target.ServiceName = source.ServiceName;
        target.Homepage = source.Homepage;
        target.Status = source.Status;
        target.Visible = source.Visible;
        target.Keywords = source.Keywords;
        target.ContactPoints = source.ContactPoints;
        target.IsDelegable = source.IsDelegable;
        target.ResourceType = source.ResourceType;
        target.RightDescription = source.RightDescription;
        target.AvailableForType = source.AvailableForType;
        target.EnterpriseUserEnabled = source.EnterpriseUserEnabled;
        target.SelfIdentifiedUserEnabled = source.SelfIdentifiedUserEnabled;
    }
}
