using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// A helper clas to process instance objects
    /// </summary>
    public static class InstanceHelper
    {
        /// <summary>
        /// Converts to a simpler instance object that includes some application metadata
        /// </summary>
        /// <param name="instances">List of instances to convert.</param>
        /// <param name="appTitles">Dictionary for application titles by language.</param>
        /// <param name="language">Desired language.</param>
        public static List<MessageBoxInstance> ConvertToMessageBoxInstance(List<Instance> instances, Dictionary<string, Dictionary<string, string>> appTitles, Language language)
        {
            List<MessageBoxInstance> simpleInstances = new List<MessageBoxInstance>();

            foreach (Instance instance in instances)
            {
                simpleInstances.Add(new MessageBoxInstance()
                {
                    CreatedDateTime = instance.CreatedDateTime,
                    DueDateTime = instance.DueDateTime,
                    Id = instance.Id,
                    InstanceOwnerId = instance.InstanceOwnerId,
                    LastChangedBy = instance.LastChangedBy,
                    Org = instance.Org,
                    AppName = instance.AppId.Split('/')[1],
                    Title = appTitles[instance.AppId]["nb"],
                    ProcessCurrentTask = instance.Process.CurrentTask,
                    AuthorizedForWrite = true,
                    AllowDelete = false
                });
            }

            return simpleInstances;
        }
    }

    /// <summary>
    /// Simple instance designed for Altinn 2 messagebox.
    /// </summary>
    public class MessageBoxInstance
    {
        /// <summary>
        /// unique guid id of the instance {guid}
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// owner of the instance.
        /// </summary>
        public string InstanceOwnerId { get; set; }

        /// <summary>
        /// application owner for the service, should be lower case.
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Application name used to identfify application
        /// </summary>
        public string AppName { get; set; }

        /// <summary>
        /// application title for the instance
        /// </summary>
        public string Title { get; set; }

        /// <summary>
        /// current task in processState
        /// </summary>
        public string ProcessCurrentTask { get; set; }

        /// <summary>
        /// create date and time for the instance
        /// </summary>
        public DateTime CreatedDateTime { get; set; }

        /// <summary>
        /// user id of the user who last changed the instance
        /// </summary>
        public string LastChangedBy { get; set; }

        /// <summary>
        /// due date to submit the instance to application owner.
        /// </summary>
        public DateTime? DueDateTime { get; set; }

        /// <summary>
        /// Boolean indicating if user is allowed to delete instance
        /// </summary>
        public bool AllowDelete { get; set; }

        /// <summary>
        /// Boolean indicating if user is authorized to write on instance
        /// </summary>
        public bool AuthorizedForWrite { get; set; }
    }
}
