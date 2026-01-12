using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Hubs.AlertsUpdate;

public interface IAlertsUpdateClient
{
    Task AlertsUpdated(AlertsUpdated alertsUpdated);
}
