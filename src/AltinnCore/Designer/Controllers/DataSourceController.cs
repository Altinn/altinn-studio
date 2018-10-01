using System;
using System.Collections.Generic;
using System.Linq;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// The controller for the data source
    /// </summary>
    public class DataSourceController : Controller
    {
        private readonly IDataSourceService _dataSourceService;

        /// <summary>
        /// Initializes a new instance of the <see cref="DataSourceController"/> class.
        /// </summary>
        /// <param name="dataSourceService">Reference the service</param>
        public DataSourceController(IDataSourceService dataSourceService)
        {
            _dataSourceService = dataSourceService;
        }
        
        /// <summary>
        /// The Index view for the data source page
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>Returns the data source to the index view</returns>
        public ActionResult Index(string org, string service, string edition)
        {
             IList<DataSourceModel> datasources = _dataSourceService.GetDatasources(org, service, edition);
            return View(datasources);
        }

        /// <summary>
        /// The http get method
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">the unique id for the data source</param>
        /// <returns>View model to the view</returns>
        public IActionResult Edit(string org, string service, string edition, string id)
        {
            IList<DataSourceModel> datasources = _dataSourceService.GetDatasources(org, service, edition);
            var selected = datasources.FirstOrDefault(d => d.Id == id);

            var model = new DataSourceEditViewModel
            {
                Id = selected?.Id ?? string.Empty,
                Url = selected?.Url ?? string.Empty,
                Description = selected?.Description ?? string.Empty,
                Opprettet = selected?.Opprettet ?? DateTime.Now
            };

            return View(model);
        }

        /// <summary>
        /// The http get for creating the view model
        /// </summary>
        /// <returns>The create view</returns>
        public IActionResult Create()
        {
            return View();
        }
        
        /// <summary>
        /// Http post for creating the JSON data source file.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="model">The model</param>
        /// <returns>Returns the model to the create page</returns>
        [HttpPost]
        public IActionResult Create(string org, string service, string edition, DataSourceCreateViewModel model)
        {
            if (ModelState.IsValid)
            {
                _dataSourceService.Create(org, service, edition, model.Description, model.Url);
                
                return RedirectToAction("Index");
            }

            ViewBag.ErrorMessages = ModelState.Values.SelectMany(s => s.Errors).ToList();

            return View("Create", model);
        }
        
        /// <summary>
        /// Http post for the edit action
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="model">The view model</param>
        /// <returns>Returns view model for the index view</returns>
        [HttpPost]
        public IActionResult Edit(string org, string service, string edition, DataSourceEditViewModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Id))
            {
                ModelState.AddModelError("AltinnModelIdMissing", "Fant ikke noe å oppdatere!");
            }

            var datasource = _dataSourceService.GetDatasources(org, service, edition);
            var selected = datasource.FirstOrDefault(d => model.Id.Equals(d?.Id, StringComparison.CurrentCultureIgnoreCase));
            if (selected == null)
            {
                ModelState.AddModelError("AltinnModelIdMissing", "Fant ikke noe å oppdatere!");
            }
            
            if (!ModelState.IsValid || selected == null)
            {
                ViewBag.ErrorMessages = ModelState.Values.SelectMany(s => s.Errors).ToList();
                return View(model);
            }

            selected.Url = model.Url;
            selected.Description = model.Description;
            _dataSourceService.Update(org, service, edition, selected);

            return RedirectToAction("Index");
        }

        /// <summary>
        /// Delete action for removing an object in the JSON list
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">Id to the JSON object</param>
        /// <returns>View model back to index</returns>
        public IActionResult Delete(string org, string service, string edition, string id)
        {
            _dataSourceService.Delete(org, service, edition, id);
            return RedirectToAction("Index");
        }

        public IActionResult Test(string org, string service, string edition, string id)
        {
            // TODO: This is no good
            var jsonResult = _dataSourceService.TestRestApi(id);

            return RedirectToAction("Index");
        }
    }
}