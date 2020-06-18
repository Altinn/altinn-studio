using System;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Receipt.Tests.Testdata
{
    public static class Instances
    {
        public static Instance Instance1 = new Instance
        {

            Id = "1000/1c3a4b9d-cbbe-4146-b370-4164e925812b",
            InstanceOwner = new InstanceOwner
            {
                PartyId = Parties.Party1.PartyId.ToString()
            },
            AppId = "tdd/auth-level-3",
            Org = "tdd",
            Created = DateTime.Parse("2019-07-31T09:57:23.4729995Z"),
            LastChanged = DateTime.Parse("2019-07-31T09:57:23.4729995Z"),
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "FormFilling"
                },
                Started = DateTime.Parse("2019-07-31T09:57:23.4729995Z")
            }
        };
    }
}
