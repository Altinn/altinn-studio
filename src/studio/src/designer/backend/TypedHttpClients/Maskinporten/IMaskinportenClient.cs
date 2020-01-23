using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Authentication;

namespace Altinn.Studio.Designer.TypedHttpClients.Maskinporten
{
    /// <summary>
    /// IMaskinportenClient
    /// </summary>
    public interface IMaskinportenClient
    {
        /// <summary>
        /// Creates a token in Maskinporten from a certificate found in IConfiguration
        /// </summary>
        /// <returns></returns>
        Task<AccessTokenModel> CreateToken();
    }
}
