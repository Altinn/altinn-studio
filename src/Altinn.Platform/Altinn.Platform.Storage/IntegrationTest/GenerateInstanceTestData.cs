using System;
using System.Collections.Generic;
using System.Net.Http;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.Models;
using Storage.Interface.Models;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// Various methods to generate test data.
    /// </summary>
    public class GenerateInstanceTestData
    {
        /// <summary>
        ///  Creates 1000 instances with random dates.
        /// </summary>
        public static bool For1000InstanceOwners(HttpClient client)
        {
            string testAppId = "tdd/m1000";
            string testOrg = "tdd";

            CreateTestApplication(testAppId, client);

            InstanceClient instanceClient = new InstanceClient(client);

            string[] processTaskIds = { "FormFilling_1", "Submit_1", null };
            string[] processEndStateIds = { "EndEvent_1", "ErrorEvent_1", null };

            Random randomInt = new Random();
            Random randomDay = new Random();
            DateTime start = new DateTime(2019, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);

            for (int i = 0; i < 1000; i++)
            {
                ProcessState processState = new ProcessState();

                if (i < 200)
                {
                    processState.CurrentTask = new ProcessElementInfo
                    {
                        Started = start,
                        ElementId = processTaskIds[0],
                    };
                }
                else if (i < 400)
                {
                    processState.CurrentTask = new ProcessElementInfo
                    {
                        Started = start,
                        ElementId = processTaskIds[1],
                    };
                }
                else if (i < 900)
                {
                    processState.Started = start;
                    processState.Ended = start.AddDays(2);
                    processState.EndEvent = processEndStateIds[0];
                }
                else
                {
                    processState.Started = start;
                    processState.EndEvent = "ErrorEvent_1";
                    processState.Ended = start.AddDays(4);
                }              

                DateTime dueDate = start.AddDays(randomDay.Next(31, 366));
                DateTime creationDate = dueDate.AddDays(-30);
                DateTime lastChangedDate = dueDate.AddDays(randomDay.Next(-20, 20));

                Instance instance = new Instance
                {
                    Org = testOrg,
                    AppId = testAppId,
                    InstanceOwnerId = (i + 1000).ToString(),
                    Process = processState,
                    LastChangedDateTime = lastChangedDate,
                    CreatedDateTime = creationDate,
                    DueDateTime = dueDate,
                    VisibleDateTime = dueDate.AddDays(-30),
                    Labels = new List<string>(),
                };

                string[] labelIds = { "zero", "one", "two" };

                if (i < 100)
                {
                    instance.Labels = null;
                }
                else if (i < 300)
                {
                    instance.Labels.Add(labelIds[0]);
                }
                else if (i < 600)
                {
                    instance.Labels.Add(labelIds[1]);
                }
                else
                {
                    instance.Labels.Add(labelIds[1]);
                    instance.Labels.Add(labelIds[2]);
                }        

                Instance resultInstance = instanceClient.PostInstances(testAppId, instance).Result;
            }            

            return true;
        }

        private static Application CreateTestApplication(string testAppId, HttpClient client)
        {
            ApplicationClient appClient = new ApplicationClient(client);

            try
            {
                Application existingApp = appClient.GetApplication(testAppId);
                return existingApp;
            }
            catch (Exception)
            {
                // do nothing.
            }

            LanguageString title = new LanguageString
            {
                { "nb", "Testapplikasjon" },
                { "en", "Test application" }
            };

            return appClient.CreateApplication(testAppId, title);
        }    
    }
}
