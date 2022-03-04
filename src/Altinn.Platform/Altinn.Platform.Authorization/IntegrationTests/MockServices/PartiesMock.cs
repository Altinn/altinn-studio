using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Register.Models;
using Authorization.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.IntegrationTests.MockServices
{
    public class PartiesMock : IParties
    {
        public Task<List<int>> GetKeyRoleParties(int userId)
        {
            List<int> result = new List<int>();
            switch (userId)
            {
                case 20001336:
                    result.Add(50001336);
                    break;
                default:
                    break;
            }

            return Task.FromResult(result);
        }

        public Task<List<MainUnit>> GetMainUnits(MainUnitQuery subunitPartyIds)
        {
            List<MainUnit> result = new List<MainUnit>();
            foreach (int subunitPartyId in subunitPartyIds.PartyIds)
            {
                switch (subunitPartyId)
                {
                    case 50001335:
                        result.Add(new MainUnit { PartyId = 50001337, SubunitPartyId = 50001335 });
                        break;
                    default:
                        break;
                }
            }            

            return Task.FromResult(result);
        }

        public Task<List<Party>> GetParties(int userId)
        {
            throw new NotImplementedException();
        }

        public Task<bool> ValidateSelectedParty(int userId, int partyId)
        {
            throw new NotImplementedException();
        }
    }
}
