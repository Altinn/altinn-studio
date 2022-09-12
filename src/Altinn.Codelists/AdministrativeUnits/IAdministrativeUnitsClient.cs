using Altinn.Codelists.AdministrativeUnits.Models;

namespace Altinn.Codelists.AdministrativeUnits.Clients
{
    public interface IAdministrativeUnitsClient
    {
        public Task<List<County>> GetCounties();
        public Task<List<Commune>> GetCommunes();
        public Task<List<Commune>> GetCommunes(string countyNumber);
    }
}
