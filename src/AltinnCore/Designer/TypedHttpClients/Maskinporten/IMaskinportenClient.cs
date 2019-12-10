using System.Threading.Tasks;
using AltinnCore.Designer.Infrastructure.Authentication;

namespace AltinnCore.Designer.TypedHttpClients.Maskinporten
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
