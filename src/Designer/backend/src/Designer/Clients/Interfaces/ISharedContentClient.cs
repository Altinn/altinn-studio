using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Clients.Interfaces;

public interface ISharedContentClient
{
    /// <summary>
    /// Publishes a code list to shared content storage.
    /// </summary>
    /// <param name="orgName">The organisation identifier.</param>
    /// <param name="codeListId">The code list id.</param>
    /// <param name="codeList">The code list.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    Task PublishCodeList(string orgName, string codeListId, CodeList codeList, CancellationToken cancellationToken = default);
}
