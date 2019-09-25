using System;
using System.Collections.Generic;
using Altinn.Platform.Storage.Models;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    /// Class exposing test data for messageboxinstancecontroller integration tests
    /// </summary>
    public class TestData
    {
        private static string instanceOwnerId_1 = "50000000";
        private static string userId_1 = "20000000";

        private static string org_1 = "TDD";
        private static string org_2 = "SPF";

        private static readonly string AppName_1 = "test-applikasjon-1";
        private static readonly string AppName_2 = "test-applikasjon-2";
        private static readonly string AppName_3 = "test-applikasjon-3";

        private static readonly string AppId_1 = $"{org_1.ToLower()}/{AppName_1}";
        private static readonly string AppId_2 = $"{org_1.ToLower()}/{AppName_2}";
        private static readonly string AppId_3 = $"{org_2.ToLower()}/{AppName_3}";

        private static Dictionary<string, string> appTitles_App1 = new Dictionary<string, string>()
        {
            { "nb", "Test applikasjon 1 bokmål" },
            { "en", "Test application 1 english" },
            { "nn-NO", "Test applikasjon 1 nynorsk" }
        };

        private static Dictionary<string, string> appTitles_App2 = new Dictionary<string, string>()
        {
             { "nb", "Test applikasjon 2 bokmål" },
             { "en", "Test application 2 english" }
        };

        private static Dictionary<string, string> appTitles_App3 = new Dictionary<string, string>()
        {
            { "nb", "Test applikasjon 3 bokmål" },
            { "nn-NO", "Test applikasjon 3 nynorsk" }
        };

        private static Application app_1 = new Application()
        {
            Id = AppId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T12:26:07.4135026Z"),
            Org = org_1,
            Title = appTitles_App1
        };

        private static Application app_2 = new Application()
        {
            Id = AppId_2,
            CreatedDateTime = Convert.ToDateTime("2019-06-20T12:26:07.4135026Z"),
            Org = org_1,
            Title = appTitles_App2
        };

        private static Application app_3 = new Application()
        {
            Id = AppId_3,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T12:26:07.4135026Z"),
            Org = org_2,
            Title = appTitles_App3
        };

        // Active instance of app 1
        private static readonly Instance Instance_1_1 = new Instance()
        {
            AppId = AppId_1,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:19:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T19:19:22.2135489Z"),
            Org = org_1,
            Process = CreateProcessState()
        };

        private static ProcessState CreateProcessState()
        {
            return new ProcessState
            {
                CurrentTask = new TaskInfo
                {
                    ProcessElementId = "FormFilling",
                },
            };
        }

        // Archived instance of app 1
        private static readonly Instance Instance_1_2 = new Instance()
        {
            AppId = AppId_1,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = true,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = org_1,
            Process = CreateProcessState(),
        };

        // Soft deleted instance of app 1
        private static readonly Instance Instance_1_3 = new Instance()
        {
            AppId = AppId_1,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = true,
                IsDeleted = true,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = org_1,
            Process = CreateProcessState(),
        };

        // Hard deleted instance of app 1
        private static readonly Instance Instance_1_4 = new Instance()
        {
            AppId = AppId_1,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:20:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = true,
                IsDeleted = true,
                IsMarkedForHardDelete = true
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T21:19:22.2135489Z"),
            Org = org_1,
            Process = CreateProcessState(),
        };

        // 1st instance of application 2
        private static readonly Instance Instance_2_1 = new Instance()
        {
            AppId = AppId_2,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T23:19:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = org_1,
            Process = CreateProcessState(),
        };

        // 2nd instance of application 2
        private static readonly Instance Instance_2_2 = new Instance()
        {
            AppId = AppId_2,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T19:19:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T19:19:22.2135489Z"),
            Org = org_1,
            Process = CreateProcessState(),
        };

        // 1st instance of application 3
        private static readonly Instance Instance_3_1 = new Instance()
        {
            AppId = AppId_3,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T17:19:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = org_2,
            Process = CreateProcessState(),
        };

        private static readonly Instance Instance_3_2 = new Instance()
        {
            AppId = AppId_3,
            CreatedBy = userId_1,
            CreatedDateTime = Convert.ToDateTime("2019-08-20T17:21:21.7920255Z"),
            InstanceOwnerId = instanceOwnerId_1,
            InstanceState = new InstanceState()
            {
                IsArchived = false,
                IsDeleted = false,
                IsMarkedForHardDelete = false
            },
            LastChangedBy = userId_1,
            LastChangedDateTime = Convert.ToDateTime("2019-08-20T23:19:22.2135489Z"),
            Org = org_2,
            Process = CreateProcessState(),
        };

        private readonly static List<Instance> InstanceList_App1 = new List<Instance>() { Instance_1_1, Instance_1_2, Instance_1_3 };
        private readonly static List<Instance> InstanceList_App2 = new List<Instance>() { Instance_2_1, Instance_2_2 };
        private readonly static List<Instance> InstanceList_App3 = new List<Instance>() { Instance_3_1, Instance_3_2 };
        private readonly static List<Instance> InstanceList_InstanceOwner1 = new List<Instance>() { Instance_1_1, Instance_1_2, Instance_1_3, Instance_1_4, Instance_2_1, Instance_2_2, Instance_3_1, Instance_3_2 };

        private readonly static Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App1 = new Dictionary<string, Dictionary<string, string>>() { { app_1.Id, appTitles_App1 } };
        private readonly static Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App2 = new Dictionary<string, Dictionary<string, string>>() { { app_2.Id, appTitles_App2 } };
        private readonly static Dictionary<string, Dictionary<string, string>> AppTitles_Dict_App3 = new Dictionary<string, Dictionary<string, string>>() { { app_3.Id, appTitles_App3 } };
        private readonly static Dictionary<string, Dictionary<string, string>> AppTitles_InstanceList_InstanceOwner1 = new Dictionary<string, Dictionary<string, string>>()
        {
            { app_1.Id, appTitles_App1 },
            { app_2.Id, appTitles_App2 },
            { app_3.Id, appTitles_App3 },
        };

        /// <summary>
        /// Gets instance owner id for all test instances
        /// </summary>
        /// <returns></returns>
        public string GetInstanceOwnerId()
        {
            return instanceOwnerId_1.ToString();
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
            return new List<Application> { app_1, app_2, app_3 };
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
