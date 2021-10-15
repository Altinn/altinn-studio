using System;
using System.Collections.Generic;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.UnitTest
{
    /// <summary>
    /// Class exposing test data for messageboxinstancecontroller integration tests
    /// </summary>
    public class MessageBoxTestData
    {
        private static readonly string InstanceOwnerPartyId_1 = "50000000";
        private static readonly string UserId_1 = "20000000";

        private static readonly string Org_1 = "tdd";
        private static readonly string Org_2 = "spf";

        private static readonly string App_1 = "test-applikasjon-1";
        private static readonly string App_2 = "test-applikasjon-2";
        private static readonly string App_3 = "test-applikasjon-3";

        private static readonly string AppId_1 = $"{Org_1.ToLower()}/{App_1}";
        private static readonly string AppId_2 = $"{Org_1.ToLower()}/{App_2}";
        private static readonly string AppId_3 = $"{Org_2.ToLower()}/{App_3}";

        private static readonly Dictionary<string, string> AppTitles_App1 = new Dictionary<string, string>()
        {
            { "nb", "Test applikasjon 1 bokmål" },
            { "en", "Test application 1 english" },
            { "nn", "Test applikasjon 1 nynorsk" }
        };

        private static readonly Dictionary<string, string> AppTitles_App2 = new Dictionary<string, string>()
        {
             { "nb", "Test applikasjon 2 bokmål" },
             { "en", "Test application 2 english" }
        };

        private static readonly Dictionary<string, string> AppTitles_App3 = new Dictionary<string, string>()
        {
            { "nb", "Test applikasjon 3 bokmål" },
            { "nn", "Test applikasjon 3 nynorsk" }
        };

        private static readonly Application Application_1 = new Application()
        {
            Id = AppId_1,
            Created = Convert.ToDateTime("2019-08-20T12:26:07.4135026Z"),
            Org = Org_1,
            Title = AppTitles_App1
        };

        private static readonly Application Application_2 = new Application()
        {
            Id = AppId_2,
            Created = Convert.ToDateTime("2019-06-20T12:26:07.4135026Z"),
            Org = Org_1,
            Title = AppTitles_App2
        };

        private static readonly Application Application_3 = new Application()
        {
            Id = AppId_3,
            Created = Convert.ToDateTime("2019-08-20T12:26:07.4135026Z"),
            Org = Org_2,
            Title = AppTitles_App3
        };

        // Active instance of app 1
        private static readonly Instance Instance_1_1 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_1,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T19:19:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus(),
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T19:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState()
        };

        // Archived instance of app 1
        private static readonly Instance Instance_1_2 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_1,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus
            {
                Archived = DateTime.UtcNow,
            },
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // Soft deleted instance of app 1
        private static readonly Instance Instance_1_3 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_1,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus
            {
                Archived = DateTime.UtcNow,
                SoftDeleted = DateTime.UtcNow,
            },
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // Hard deleted instance of app 1
        private static readonly Instance Instance_1_4 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_1,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus
            {
                Archived = DateTime.UtcNow,
                SoftDeleted = DateTime.UtcNow,
                HardDeleted = DateTime.UtcNow,
            },
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // 1st instance of application 2
        private static readonly Instance Instance_2_1 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_2,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T23:19:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus(),
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // 2nd instance of application 2
        private static readonly Instance Instance_2_2 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_2,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T19:19:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus(),
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T19:19:22.2135489Z"),
            Org = Org_1,
            Process = CreateProcessState(),
        };

        // 1st instance of application 3
        private static readonly Instance Instance_3_1 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_3,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T17:19:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus(),
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = Org_2,
            Process = CreateProcessState(),
        };

        private static readonly Instance Instance_3_2 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_3,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T17:21:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus(),
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = Org_2,
            Process = CreateProcessState(),
        };

        // Archived instance of app 4
        private static readonly Instance Instance_4_1 = new Instance()
        {
            Id = InstanceOwnerPartyId_1 + "/" + Guid.NewGuid().ToString(),
            AppId = AppId_1,
            CreatedBy = UserId_1,
            Created = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId_1 },
            Status = new InstanceStatus
            {
                Archived = DateTime.UtcNow,
            },
            LastChangedBy = UserId_1,
            LastChanged = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = Org_1,
            Process = new ProcessState { EndEvent = "EndTask" }
        };

        private static ProcessState CreateProcessState()
        {
            return new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = "Task_1",
                    Name = "FormFilling",
                },
            };
        }

        private static readonly List<Instance> InstanceList_App1 = new List<Instance>() { Instance_1_1, Instance_1_2, Instance_1_3 };
        private static readonly List<Instance> InstanceList_App2 = new List<Instance>() { Instance_2_1, Instance_2_2 };
        private static readonly List<Instance> InstanceList_App3 = new List<Instance>() { Instance_3_1, Instance_3_2 };
        private static readonly List<Instance> InstanceList_App4 = new List<Instance>() { Instance_4_1 };
        private static readonly List<Instance> InstanceList_InstanceOwner1 = new List<Instance>() { Instance_1_1, Instance_1_2, Instance_1_3, Instance_1_4, Instance_2_1, Instance_2_2, Instance_3_1, Instance_3_2 };

        public static readonly Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App1 = new Dictionary<string, Dictionary<string, string>>
            { { Application_1.Id, AppTitles_App1 } };

        public static readonly Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App2 = new Dictionary<string, Dictionary<string, string>>
            { { Application_2.Id, AppTitles_App2 } };

        public static readonly Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App3 = new Dictionary<string, Dictionary<string, string>>
            { { Application_3.Id, AppTitles_App3 } };

        private static readonly Dictionary<string, Dictionary<string, string>> AppTitles_InstanceList_InstanceOwner1 = new Dictionary<string, Dictionary<string, string>>()
        {
            { Application_1.Id, AppTitles_App1 },
            { Application_2.Id, AppTitles_App2 },
            { Application_3.Id, AppTitles_App3 },
        };

        /// <summary>
        /// Gets instance owner id for all test instances
        /// </summary>
        /// <returns></returns>
        public string GetInstanceOwnerPartyId()
        {
            return InstanceOwnerPartyId_1.ToString();
        }

        /// <summary>
        /// Doc
        /// </summary>
        /// <returns></returns>
        public List<string> GetAppIds()
        {
            return new List<string>() { AppId_1, AppId_2, AppId_3 };
        }

        /// <summary>
        /// Gets application title dictinoary based on application id.
        /// </summary>
        public List<Application> GetApps()
        {
            return new List<Application> { Application_1, Application_2, Application_3 };
        }

        /// <summary>
        /// Contains three instances.
        /// Title available in three languages.
        /// One instance in each state; active, archived, deleted.
        /// </summary>
        public List<Instance> GetInstances_App1()
        {
            return InstanceList_App1;
        }

        /// <summary>
        /// Contains two instances.
        /// Title available in nb og en.
        /// Both instances are active.
        /// </summary>
        public List<Instance> GetInstances_App2()
        {
            return InstanceList_App2;
        }

        /// <summary>
        /// Contains two instances.
        /// Title available in nb og nn.
        /// Both instances are active.
        /// </summary>
        public List<Instance> GetInstances_App3()
        {
            return InstanceList_App3;
        }

        /// <summary>
        /// Contains one instances.
        /// Title available in three languages.
        /// Instance is archived and task is null. 
        /// </summary>
        public List<Instance> GetInstances_App4()
        {
            return InstanceList_App4;
        }

        /// <summary>
        /// Produces a list of test instances
        /// </summary>
        public List<Instance> GetInstances()
        {
            return InstanceList_InstanceOwner1;
        }

        /// <summary>
        /// Returns a hard deleted instance
        /// </summary>
        public Instance GetHardDeletedInstance()
        {
            return Instance_1_4;
        }

        /// <summary>
        /// Returns a soft deleted instance
        /// </summary>
        public Instance GetSoftDeletedInstance()
        {
            return Instance_1_3;
        }

        /// <summary>
        /// Returns an archived instance
        /// </summary>
        public Instance GeArchivedInstance()
        {
            return Instance_1_2;
        }

        /// <summary>
        /// Returns an active instance
        /// </summary>
        public Instance GetActiveInstance()
        {
            return Instance_1_1;
        }
    }
}
