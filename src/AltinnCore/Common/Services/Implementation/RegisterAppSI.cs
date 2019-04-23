using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using IRegister = AltinnCore.ServiceLibrary.Services.Interfaces.IRegister;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Register service for service development. Uses local disk to store register data
    /// </summary>
    public class RegisterAppSI : IRegister
    {
        private readonly IDSF _dsf;
        private readonly IER _er;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterAppSI"/> class
        /// </summary>
        /// <param name="dfs">The dfs</param>
        /// <param name="er">The er</param>
        public RegisterAppSI(IDSF dfs, IER er)
        {
            _dsf = dfs;
            _er = er;
        }

        /// <summary>
        /// The access to the dsf component through register services
        /// </summary>
        public IDSF DSF
        {
            get { return _dsf; }
            protected set { }
        }

        /// <summary>
        /// The access to the er component through register services
        /// </summary>
        public IER ER
        {
            get { return _er; }
            protected set { }
        }

        /// <inheritdoc/>
        public Task<Party> GetParty(int partyId)
        {
            throw new System.NotImplementedException();
        }
    }
}
