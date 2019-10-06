using Altinn.Platform.Storage.Models;
using Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.UnitTest
{
    public static class TestData
    {
        public static string InstanceOwnerId_1 = "50000000";
        public static string UserId_1 = "20000000";

        public static string Org_1 = "TDD";
        public static string Org_2 = "SPF";

        public static string App_1 = "test-applikasjon-1";
        public static string App_2 = "test-applikasjon-2";
        public static string App_3 = "test-applikasjon-3";

        public static string AppId_1 = $"{Org_1.ToLower()}/{App_1}";
        public static string AppId_2 = $"{Org_1.ToLower()}/{App_2}";
        public static string AppId_3 = $"{Org_2.ToLower()}/{App_3}";

        public static Dictionary<string, string> AppTitles_App1 = new Dictionary<string, string>()
        {
            { "nb", "Test applikasjon 1 bokmål"},
            { "en", "Test application 1 english"},
            { "nn-NO", "Test applikasjon 1 nynorsk"}
        };

        public static Dictionary<string, string> AppTitles_App2 = new Dictionary<string, string>()
        {
             { "nb", "Test applikasjon 2 bokmål"},
             { "en", "Test application 2 english"}
        };

        public static Dictionary<string, string> AppTitles_App3 = new Dictionary<string, string>()
        {
            { "nb", "Test applikasjon 3 bokmål"},
            { "nn-NO", "Test applikasjon 3 nynorsk"}
        };

        public static Application Application_1 = new Application()
        {
            Id = AppId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T12:26:07.4135026Z"),
            Org = Org_1,
            Title = AppTitles_App1
        };

        public static Application Application_2 = new Application()
        {
            Id = AppId_2,
            CreatedDateTime = Convert.ToDateTime("2019-06-20T12:26:07.4135026Z"),
            Org = Org_1,
            Title = AppTitles_App2
        };

        public static Application Application_3 = new Application()
        {
            Id = AppId_3,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T12:26:07.4135026Z"),
            Org = Org_2,
            Title = AppTitles_App3
        };

        // 1st instance of application 1
        public static Instance Instance_1_1 = new Instance()
        {
            Id = $"{InstanceOwnerId_1}/31d0941f-6d56-40a6-b4a4-b7fe18ccff30",
            AppId = AppId_1,
            CreatedBy = UserId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:19:21.7920255Z"),
            InstanceOwnerId = InstanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = UserId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T19:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState()
        };

        private static ProcessState CreateProcessState()
        {
            return new ProcessState()
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "FormFilling"
                },
                
            };
        }

        // 2nd instance of application 1
        public static Instance Instance_1_2 = new Instance()
        {
            Id = $"{InstanceOwnerId_1}/c6b37e02-14eb-43a9-852c-a3d3aeffcb44",
            AppId = AppId_1,
            CreatedBy = UserId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwnerId = InstanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = UserId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // 1st instance of application 2
        public static Instance Instance_2_1 = new Instance()
        {
            Id = $"{InstanceOwnerId_1}/d851287a-8c7a-4cf1-91ca-7d216c1336c4",
            AppId = AppId_2,
            CreatedBy = UserId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T23:19:21.7920255Z"),
            InstanceOwnerId = InstanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = UserId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // 2nd instance of application 2
        public static Instance Instance_2_2 = new Instance()
        {
            Id = $"{InstanceOwnerId_1}/96cc315c-c8cc-4775-b81a-5cf134f00df1",
            AppId = AppId_2,
            CreatedBy = UserId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:19:21.7920255Z"),
            InstanceOwnerId = InstanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = UserId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T19:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // 1st instance of application 3
        public static Instance Instance_3_1 = new Instance()
        {
            Id = $"{InstanceOwnerId_1}/83d87ad9-52a3-44de-aacd-ce79d55ef1f4",
            AppId = AppId_3,
            CreatedBy = UserId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T17:19:21.7920255Z"),
            InstanceOwnerId = InstanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = UserId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = Org_2,
            Process = CreateProcessState(),
        };


        // 2nd instance of application 3
        public static Instance Instance_3_2 = new Instance()
        {
            Id = $"{InstanceOwnerId_1}/dc489d27-6bf5-437b-95eb-de79c3a20b89",
            AppId = AppId_3,
            CreatedBy = UserId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T17:21:21.7920255Z"),
            InstanceOwnerId = InstanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = UserId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = Org_2,
            Process = CreateProcessState(),
        };

        public static List<Instance> InstanceList_App1 = new List<Instance>() { Instance_1_1, Instance_1_2 };
        public static List<Instance> InstanceList_App2 = new List<Instance>() { Instance_2_1, Instance_2_2 };
        public static List<Instance> InstanceList_App3 = new List<Instance>() { Instance_3_1, Instance_3_2 };
        public static List<Instance> InstanceList_InstanceOwner1 = new List<Instance>() { Instance_1_1, Instance_1_2, Instance_2_1, Instance_2_2, Instance_3_1, Instance_3_2 };

        public static Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App1 = new Dictionary<string, Dictionary<string, string>>() { { Application_1.Id, AppTitles_App1 } };
        public static Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App2 = new Dictionary<string, Dictionary<string, string>>() { { Application_2.Id, AppTitles_App2 } };
        public static Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App3 = new Dictionary<string, Dictionary<string, string>>() { { Application_3.Id, AppTitles_App3 } };
        public static Dictionary<string, Dictionary<string, string>> AppTitles_InstanceList_InstanceOwner1 = new Dictionary<string, Dictionary<string, string>>()
        {
            { Application_1.Id, AppTitles_App1 },
            { Application_2.Id, AppTitles_App2 },
            { Application_3.Id, AppTitles_App3 }
        };

    }
}
