using System;
using System.Collections.Generic;
using Altinn.Platform.Storage.Models;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;

namespace Common.Helpers
{
    /// <summary>
    /// Various helper methods for instantiation
    /// </summary>
    public static class InstantiationHelper
    {
        private const string BANKRUPTCY_CODE = "KBO";
        private const string SUB_UNIT_CODE = "BEDR";
        private const string SUB_UNIT_CODE_AAFY = "AAFY";

        /// <summary>
        /// Filters a list of parties based on an applications allowed party types.
        /// </summary>
        /// <param name="parties">The list of parties to be filtered</param>
        /// <param name="partyTypesAllowed">The allowed party types</param>
        /// <returns>A list with the filtered parties</returns>
        public static List<Party> FilterPartiesByAllowedPartyTypes(List<Party> parties, PartyTypesAllowed partyTypesAllowed)
        {
            List<Party> allowed = new List<Party>();
            if (parties == null || partyTypesAllowed == null)
            {
                return allowed;
            }

            parties.ForEach(party =>
            {
                if (IsPartyAllowedToInstantiate(party, partyTypesAllowed))
                {
                    allowed.Add(party);
                }
            });
            return allowed;
        }

        /// <summary>
        /// Checks if a party is allowed to initiate an application based on the applications AllowedPartyTypes
        /// </summary>
        /// <param name="party">The party to check</param>
        /// <param name="partyTypesAllowed">The allowed party types</param>
        /// <returns>True or false</returns>
        public static bool IsPartyAllowedToInstantiate(Party party, PartyTypesAllowed partyTypesAllowed)
        {
            if (party == null)
            {
                return false;
            }

            if (partyTypesAllowed == null || (!partyTypesAllowed.BankruptcyEstate && !partyTypesAllowed.Organization && !partyTypesAllowed.Person && !partyTypesAllowed.SubUnit))
            {
                // if party types not set, all parties are allowed to initiate
                return true;
            }

            PartyType partyType = party.PartyTypeName;
            bool isAllowed = false;
            switch (partyType)
            {
                case PartyType.Person:
                    if (partyTypesAllowed.Person == true)
                    {
                        isAllowed = true;
                    }

                    break;
                case PartyType.Organization:
                    if (partyTypesAllowed.Organization == true)
                    {
                        isAllowed = true;
                    }
                    else if (partyTypesAllowed.BankruptcyEstate == true)
                    {
                        // BankruptcyEstate is a sub group of organization
                        if (party.UnitType != null && BANKRUPTCY_CODE.Equals(party.UnitType.Trim()))
                        {
                            // The org is a BankruptcyEstate, and BankruptcyEstate are allowed to initiate
                            isAllowed = true;
                        }
                    }
                    else if (partyTypesAllowed.SubUnit == true)
                    {
                        // SubUnit is a sub group of organization
                        if (party.UnitType != null && (SUB_UNIT_CODE.Equals(party.UnitType.Trim()) || SUB_UNIT_CODE_AAFY.Equals(party.UnitType.Trim())))
                        {
                            // The org is a SubUnit, and SubUnits are allowed to initiate
                            isAllowed = true;
                        }
                    }

                    break;
                case PartyType.SelfIdentified:
                    if (partyTypesAllowed.Person == true)
                    {
                        isAllowed = true;
                    }

                    break;
            }

            return isAllowed;
        }

        /// <summary>
        /// Finds a party based on partyId
        /// </summary>
        /// <param name="partyList">The party list</param>
        /// <param name="partyId">The party id</param>
        /// <returns>True or false</returns>
        public static Party GetPartyByPartyId(List<Party> partyList, int partyId)
        {
            if (partyList == null)
            {
                return null;
            }

            return partyList.Find(party =>
            {
                return party.PartyId == partyId;
            });
        }
    }
}
