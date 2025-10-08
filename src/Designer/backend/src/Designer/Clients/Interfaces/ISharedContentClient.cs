using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Clients.Interfaces;

public interface ISharedContentClient
{
    Task PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default);
}
