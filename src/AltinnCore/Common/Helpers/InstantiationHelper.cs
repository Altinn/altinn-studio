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
                bool isChildPartyAllowed = false;
                List<Party> allowedChildParties = null;
                if (party.ChildParties != null)
                {
                    allowedChildParties = new List<Party>();
                    foreach (Party childParty in party.ChildParties)
                    {
                        if (IsPartyAllowedToInstantiate(childParty, partyTypesAllowed))
                        {
                            allowedChildParties.Add(childParty);
                            isChildPartyAllowed = true;
                        }
                    }
                }

                if (IsPartyAllowedToInstantiate(party, partyTypesAllowed) && isChildPartyAllowed)
                {
                    party.ChildParties = new List<Party>();
                    party.ChildParties.AddRange(allowedChildParties);
                    allowed.Add(party);
                }
                else if (!IsPartyAllowedToInstantiate(party, partyTypesAllowed) && isChildPartyAllowed)
                {
                    party.ChildParties = new List<Party>();
                    party.OnlyHierarchyElementWithNoAccess = true;
                    party.ChildParties.AddRange(allowedChildParties);
                    allowed.Add(party);
                }
                else if (IsPartyAllowedToInstantiate(party, partyTypesAllowed))
                {
                    party.ChildParties = new List<Party>();
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

            if (partyTypesAllowed == null || (!partyTypesAllowed.BankruptcyEstate && !partyTypesAllowed.Organisation && !partyTypesAllowed.Person && !partyTypesAllowed.SubUnit))
            {
                // if party types not set, all parties are allowed to initiate
                return true;
            }

            PartyType partyType = party.PartyTypeName;
            bool isAllowed = false;

            bool isSubUnit = party.UnitType != null && (SUB_UNIT_CODE.Equals(party.UnitType.Trim()) || SUB_UNIT_CODE_AAFY.Equals(party.UnitType.Trim()));
            bool isMainUnit = !isSubUnit;
            bool isKbo = party.UnitType != null && BANKRUPTCY_CODE.Equals(party.UnitType.Trim());

            switch (partyType)
            {
                case PartyType.Person:
                    if (partyTypesAllowed.Person == true)
                    {
                        isAllowed = true;
                    }

                    break;
                case PartyType.Organization:

                    if (isMainUnit && partyTypesAllowed.Organisation)
                    {
                        isAllowed = true;
                    }
                    else if (isSubUnit && partyTypesAllowed.SubUnit)
                    {
                        isAllowed = true;
                    }
                    else if (isKbo && partyTypesAllowed.BankruptcyEstate)
                    {
                        isAllowed = true;
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
        /// <returns>party from the party list</returns>
        public static Party GetPartyByPartyId(List<Party> partyList, int partyId)
        {
            if (partyList == null)
            {
                return null;
            }

            Party validParty = null;

            foreach (Party party in partyList)
            {
                if (party.PartyId == partyId)
                {
                    validParty = party;
                }
                else if (party.ChildParties != null && party.ChildParties.Count > 0)
                {
                    validParty = party.ChildParties.Find(cp => cp.PartyId == partyId);
                }
            }

            return validParty;
        }
    }
}
