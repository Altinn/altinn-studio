using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Models;

namespace Altinn.App.Options
{
    public class PersonListProvider : IDataListProvider
    {
        public string Id { get; set; } = "people";

        public Task<DataList> GetDataListAsync(
            string language,
            Dictionary<string, string> keyValuePairs
        )
        {
            string search = "";
            keyValuePairs.TryGetValue("search", out search);

            int start = 0;
            int count = 10;
            if (
                keyValuePairs.TryGetValue("size", out var size)
                && keyValuePairs.TryGetValue("page", out var page)
            )
            {
                start = int.Parse(size) * int.Parse(page);
                count = int.Parse(size);
            }

            List<ListItem> items = new List<ListItem>();

            items.Add(new ListItem { Name = "Caroline", Age = "28", Profession = "Utvikler" });
            items.Add(new ListItem { Name = "Kåre", Age = "37", Profession = "Sykepleier" });
            items.Add(new ListItem { Name = "Johanne", Age = "27", Profession = "Utvikler" });
            items.Add(new ListItem { Name = "Kari", Age = "56", Profession = "Snekker" });
            items.Add(new ListItem { Name = "Petter", Age = "19", Profession = "Personlig trener" });
            items.Add(new ListItem { Name = "Hans", Age = "80", Profession = "Pensjonist" });
            items.Add(new ListItem { Name = "Siri", Age = "28", Profession = "UX designer" });
            items.Add(new ListItem { Name = "Tiril", Age = "40", Profession = "Arkitekt" });
            items.Add(new ListItem { Name = "Karl", Age = "49", Profession = "Skuespiller" });
            items.Add(new ListItem { Name = "Mette", Age = "33", Profession = "Artist" });

            if (!String.IsNullOrEmpty(search))
            {
                var s = search.ToLower();
                items = items
                    .Where(o =>
                    {
                        var n = o.Name.ToLower();
                        var a = o.Age.ToString();
                        var p = o.Profession.ToLower();

                        return n.Contains(s) || a.Contains(s) || p.Contains(s);
                    })
                    .ToList();
            }

            if (keyValuePairs.TryGetValue("sortDirection", out var sortDirection))
            {
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

            DataListMetadata appListsMetaData = new DataListMetadata()
            {
                TotaltItemsCount = items.Count
            };

            List<object> objectList = new List<object>();
            items.ForEach(o => objectList.Add(o));

            int boundedCount = start + count > items.Count ? items.Count - start : count;
            return Task.FromResult(
                new DataList
                {
                    ListItems = objectList.GetRange(start, boundedCount),
                    _metaData = appListsMetaData
                }
            );
        }
    }
}
