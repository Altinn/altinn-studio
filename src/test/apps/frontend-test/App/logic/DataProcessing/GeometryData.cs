#nullable enable

using System.Collections.Generic;
using System.Linq;
using Altinn.App.Models;

namespace Altinn.App.logic.DataProcessing;

public class GeometryData
{
    private static readonly Dictionary<string, Geometry> GeometryMap = new()
    {
        ["1"] = new() { Label = "Hankabakken 1", Data = "POLYGON ((16.1096835728424 67.1452365035596,16.1190491078039 67.1451712353654,16.118841539588 67.1406869499763,16.109477740932 67.1407522039498,16.1096835728424 67.1452365035596))" },
        ["2"] = new() { Label = "Hankabakken 2", Data = "POLYGON ((16.0844471059834 67.1454096440408,16.1096835728424 67.1452365035596,16.1096284017344 67.1440347115437,16.0843931889725 67.1442078419132,16.0844471059834 67.1454096440408))" },
        ["3"] = new() { Label = "Hankabakken 3", Data = "POLYGON ((16.0843931889725 67.1442078419132,16.0914055727082 67.1441601320718,16.0912573849201 67.1408776044743,16.0842459528488 67.1409253067063,16.0843931889725 67.1442078419132))" },
        ["4"] = new() { Label = "Hankabakken 4", Data = "POLYGON ((16.091294225332 67.1416937521884,16.1095151961509 67.1415683466908,16.109477740932 67.1407522039498,16.0912573849201 67.1408776044743,16.091294225332 67.1416937521884))" },
        ["5"] = new() { Label = "Hankabakken 5", Data = "POLYGON ((16.0957778974798 67.1408466860878,16.118841539588 67.1406869499763,16.1186340551949 67.1362026617326,16.0955746880334 67.1363623630455,16.0957778974798 67.1408466860878))" },
        ["6"] = new() { Label = "Hankabakken 6", Data = "POINT (16.098 67.140)" },
        ["7"] = new() { Label = "Hankabakken 7", Data = "POINT (16.092 67.138)" },
        ["8"] = new() { Label = "Hankabakken 8", Data = "POINT (16.100 67.1365)" }
    };

    public static List<Geometry> GetGeometryData(string? selected)
    {
        List<Geometry> geometries = new List<Geometry>();

        if (!string.IsNullOrEmpty(selected))
        {
            foreach (var key in GeometryMap.Keys)
            {
                if (selected.Contains(key))
                {
                    geometries.Add(new Geometry
                    {
                        Label = GeometryMap[key].Label,
                        Data = GeometryMap[key].Data
                    });
                }
            }
        }

        return geometries;
    }

    public static void UpdateGeometryData(List<Geometry> existingGeometries, string? selected)
    {
        var selectedItems = new HashSet<string>();
        if (!string.IsNullOrEmpty(selected))
        {
            foreach (var key in GeometryMap.Keys)
            {
                if (selected.Contains(key))
                {
                    selectedItems.Add(key);
                }
            }
        }

        var existingLabels = existingGeometries.Select(g => g.Label).ToHashSet();
        var geometriesToRemove = new List<Geometry>();

        foreach (var geometry in existingGeometries)
        {
            var matchingKey = GeometryMap.FirstOrDefault(kvp => kvp.Value.Label == geometry.Label).Key;
            if (matchingKey != null && !selectedItems.Contains(matchingKey))
            {
                geometriesToRemove.Add(geometry);
            }
        }

        foreach (var geometry in geometriesToRemove)
        {
            existingGeometries.Remove(geometry);
        }

        foreach (var selectedKey in selectedItems)
        {
            if (GeometryMap.TryGetValue(selectedKey, out var geometryTemplate))
            {
                if (!existingLabels.Contains(geometryTemplate.Label))
                {
                    existingGeometries.Add(new Geometry
                    {
                        Label = geometryTemplate.Label,
                        Data = geometryTemplate.Data
                    });
                }
            }
        }
    }
}
