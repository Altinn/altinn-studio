using System;
using System.Collections.Generic;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Mvc.Rendering;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Services
{
    /// <summary>
    /// This implements the services available in the platform that can be used by services.
    /// After it is set in production only new methods can be added.
    /// </summary>
    public class PlatformServices : IPlatformServices
    {
        private readonly IAuthorization _authorization;
        private readonly IRepository _repository;
        private readonly IExecution _execution;

        /// <summary>
        /// Initializes a new instance of the <see cref="PlatformServices" /> class
        /// </summary>
        /// <param name="authorizationService">The Authorization service</param>
        /// <param name="repositoryService">The repository service</param>
        /// <param name="executionService">The execution service</param>
        /// <param name="org">The current service owner</param>
        /// <param name="service">The current service</param>
        public PlatformServices(IAuthorization authorizationService, IRepository repositoryService, IExecution executionService, string org, string service)
        {
            _authorization = authorizationService;
            _repository = repositoryService;
            _execution = executionService;

            Org = org;
            Service = service;
        }

        /// <summary>
        /// Gets or sets the orgId
        /// </summary>
        protected string Org { get; set; }

        /// <summary>
        /// Gets or sets the service
        /// </summary>
        protected string Service { get; set; }

        /// <summary>
        /// Gets the ReporteeList for a given userID
        /// </summary>
        /// <param name="userID">The userID</param>
        /// <returns>The list of reportee</returns>
        public List<Reportee> GetReporteeList(int userID)
        {
            return _authorization.GetReporteeList(userID);
        }

        /// <summary>
        /// Gets contents of a code list in a format which can be used in asp .net tag helpers for dropdowns
        /// </summary>
        /// <param name="name">The name of the code list</param>
        /// <param name="textKey">The key of the code list value to use as the display text</param>
        /// <param name="valueKey">The key of the code list value to use as the item value</param>
        /// <param name="codelistSource">
        /// Where to get the code list from, if not set the following search order will be used:
        /// 1. Service
        /// 2. Service owner
        /// </param>
        /// <returns>A list which can be used for populating dropdowns etc. using tag helpers</returns>
        public List<SelectListItem> GetPresentationCodelist(string name, string textKey, string valueKey, CodeListSourceType codelistSource = CodeListSourceType.Unspecified)
        {
            string codelist = GetCodelist(name, codelistSource);
            JObject codelistJson = JObject.Parse(codelist);

            if (string.IsNullOrEmpty(valueKey))
            {
                // Set to default key if no specific is choosen
                valueKey = "key";
            }

            List<SelectListItem> list = new List<SelectListItem>();
            foreach (JObject item in codelistJson["codes"])
            {
                list.Add(new SelectListItem { Text = (string)item[textKey], Value = (string)item[valueKey] });
            }

            return list;
        }

        /// <summary>
        /// Gets the contents of a code list
        /// </summary>
        /// <param name="name">The name of the code list to get</param>
        /// <param name="codelistSource">
        /// Where to get the code list from, if not set the following search order will be used:
        /// 1. Service
        /// 2. Service owner
        /// </param>
        /// <returns>The requested code list if found</returns>
        public string GetCodelist(string name, CodeListSourceType codelistSource = CodeListSourceType.Unspecified)
        {
            switch (codelistSource)
            {
                case CodeListSourceType.Service:
                    {
                        return _execution.GetCodelist(Org, Service, name);
                    }

                case CodeListSourceType.Owner:
                    {
                        return _execution.GetCodelist(Org, null, name);
                    }

                case CodeListSourceType.Platform:
                    {
                        throw new NotImplementedException();
                    }

                default:
                    {
                        string codelist = _execution.GetCodelist(Org, Service, name);
                        if (!string.IsNullOrEmpty(codelist))
                        {
                            return codelist;
                        }

                        codelist = _execution.GetCodelist(Org, Service, name);
                        if (!string.IsNullOrEmpty(codelist))
                        {
                            return codelist;
                        }

                        codelist = _execution.GetCodelist(Org, null, name);
                        if (!string.IsNullOrEmpty(codelist))
                        {
                            return codelist;
                        }

                        return null;
                    }
            }
        }
    }
}
