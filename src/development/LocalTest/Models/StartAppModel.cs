using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace LocalTest.Models
{
    public class StartAppModel
    {
        /// <summary>
        /// The name of the app
        /// </summary>
        public string App { get; set; }

        /// <summary>
        /// The name of the org
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Defines if a app has defined invalid path
        /// </summary>
        public bool InvalidAppPath { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string AppTitle { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string AppPath { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string StaticTestDataPath { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public bool InvalidTestDataPath { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string LocalAppUrl { get; set; }

        /// <summary>
        ///
        /// </summary>
        public HttpRequestException HttpException { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public int UserId { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string SelectedApp { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public string AppPathSelection { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public IEnumerable<SelectListItem> TestUsers { get; set; }

        /// <summary>
        /// 
        /// </summary>
        public IEnumerable<SelectListItem> TestApps { get; set; }
    }
}
