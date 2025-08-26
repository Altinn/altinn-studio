using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Hubs.Preview;

public interface IPreviewClient
{
    Task ReceiveMessage(string message);
}
