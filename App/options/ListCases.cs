using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Models;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.Options
{
    public class ListCases : IDataListProvider
    {
        public string Id { get; set; } = "people";

        public Task<DataList> GetDataListAsync(string language, Dictionary<string, string> keyValuePairs)
        {
            int start = 0;
            int count = 10;
            string search = "";

            if (keyValuePairs.ContainsKey("search") )
            {
                search = keyValuePairs["search"];
            }

            if (keyValuePairs.ContainsKey("size") && keyValuePairs.ContainsKey("page"))
            {
                string size = keyValuePairs["size"];
                string page = keyValuePairs["page"];

                start = int.Parse(size) * int.Parse(page);
                count = int.Parse(size);
            }

            List<ListItem> items = new List<ListItem>();

            items.Add(new ListItem { Name = "Caroline", Age = 28, Profession = "Utvikler" });
            items.Add(new ListItem { Name = "Kåre", Age = 37, Profession = "Sykepleier" });
            items.Add(new ListItem { Name = "Johanne", Age = 27, Profession = "Utvikler" });
            items.Add(new ListItem { Name = "Kari", Age = 56, Profession = "Snekker" });
            items.Add(new ListItem { Name = "Petter", Age = 19, Profession = "Personlig trener" });
            items.Add(new ListItem { Name = "Hans", Age = 80, Profession = "Pensjonist" });
            items.Add(new ListItem { Name = "Siri", Age = 28, Profession = "UX designer" });
            items.Add(new ListItem { Name = "Tiril", Age = 40, Profession = "Arkitekt" });
            items.Add(new ListItem { Name = "Karl", Age = 49, Profession = "Skuespiller" });
            items.Add(new ListItem { Name = "Mette", Age = 33, Profession = "Artist" });

            
            if (!String.IsNullOrEmpty(search))
            {
                items = items.Where(o => (o.Name == search)).ToList();
            }

            if (keyValuePairs.ContainsKey("sortDirection"))
            {
                string sortDirection = keyValuePairs["sortDirection"];
                if (sortDirection == "asc")
                {
                    items = items.OrderBy(o => o.Age).ToList();
                }
                else if (sortDirection == "desc") 
                {
                    items = items.OrderBy(o => o.Age).ToList();
                    items.Reverse();
                }
            }
            
            DataListMetadata appListsMetaData = new DataListMetadata() { TotaltItemsCount = items.Count };
           
            List<object> objectList = new List<object>();
            items.ForEach(o => objectList.Add(o));

            int boundedCount = start + count > items.Count ? items.Count - start : count;
            return Task.FromResult(new DataList { ListItems = objectList.GetRange(start, boundedCount), _metaData = appListsMetaData });
        }
    }
}
