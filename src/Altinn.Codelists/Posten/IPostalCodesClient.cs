using Altinn.Codelists.Posten.Clients;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Codelists.Posten
{
    /// <summary>
    /// Client for getting postal codes
    /// </summary>
    public interface IPostalCodesClient
    {
        Task<List<PostalCodeRecord>> GetPostalCodes();
    }
}
