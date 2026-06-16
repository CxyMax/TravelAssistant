# Amap MCP Server — Tool Reference

Source: `~/.cache/uv/archive-v0/vdjtYBKaKGdCammj/lib/python3.10/site-packages/amap_mcp_server/server.py`

All tools require the env var `AMAP_MAPS_API_KEY`. On error every tool returns `{"error": "<message>"}`.

---

## Geocoding

### `maps_geo`

Convert a structured address (or landmark name) to coordinates.

| Param | Type | Required | Description |
|---|---|---|---|
| `address` | `str` | yes | Address or landmark name |
| `city` | `str` | no | City hint to improve accuracy |

**Returns**
```json
{
  "return": [
    {
      "country": "中国",
      "province": "北京市",
      "city": "北京市",
      "citycode": "010",
      "district": "东城区",
      "street": "景山前街",
      "number": "4号",
      "adcode": "110101",
      "location": "116.397005,39.919278",
      "level": "门址"
    }
  ]
}
```

> `location` is `"longitude,latitude"`. Multiple results may be returned when the address is ambiguous — always use `return[0]`.

**Demo**
```python
maps_geo("景山前街4号", city="北京")
maps_geo("故宫博物院")
```

---

### `maps_regeocode`

Convert a coordinate to an administrative address (reverse geocode).

| Param | Type | Required | Description |
|---|---|---|---|
| `location` | `str` | yes | `"longitude,latitude"` e.g. `"116.397,39.919"` |

**Returns**
```json
{
  "province": "北京市",
  "city": "北京市",
  "district": "东城区"
}
```

**Demo**
```python
maps_regeocode("116.397005,39.919278")
```

---

## Search

### `maps_text_search`

Keyword POI search. **Does not return `location` coordinates** — use `maps_geo` or `maps_search_detail` to get coordinates for a result. 用于搜索景点

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `keywords` | `str` | yes | — | Search keywords |
| `city` | `str` | no | `""` | City to search in |
| `citylimit` | `str` | no | `"false"` | `"true"` to restrict results to `city` |

**Returns**
```json
{
  "suggestion": {
    "keywords": [],
    "cities": [{"name": "北京"}]
  },
  "pois": [
    {
      "id": "B000A8UIN8",
      "name": "故宫博物院",
      "address": "景山前街4号",
      "typecode": "110201|140100"
    }
  ]
}
```

**Demo**
```python
maps_text_search("故宫", city="北京", citylimit="true")
maps_text_search("咖啡", city="上海")
```

---

### `maps_around_search`

Search POIs within a radius of a coordinate.

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `location` | `str` | yes | — | Center point `"longitude,latitude"` |
| `radius` | `str` | no | `"1000"` | Search radius in metres |
| `keywords` | `str` | no | `""` | Optional keyword filter |

**Returns**
```json
{
  "pois": [
    {
      "id": "B000A8UIN8",
      "name": "故宫博物院",
      "address": "景山前街4号",
      "typecode": "110201"
    }
  ]
}
```

> Same as `maps_text_search`, no `location` field in results.

**Demo**
```python
maps_around_search("116.397,39.919", radius="500", keywords="餐厅")
maps_around_search("116.397,39.919", radius="2000")
```

---

### `maps_search_detail`

Get full details for a POI by ID (from `maps_text_search` or `maps_around_search`). **This is the only search tool that returns `location` coordinates.**

| Param | Type | Required | Description |
|---|---|---|---|
| `id` | `str` | yes | POI ID from a prior search |

**Returns**
```json
{
  "id": "B000A8UIN8",
  "name": "故宫博物院",
  "location": "116.397,39.919",
  "address": "景山前街4号",
  "business_area": "东城",
  "city": "北京市",
  "type": "风景名胜;著名景点;著名景点",
  "alias": "紫禁城"
}
```

> If the POI has `biz_ext` data (e.g. rating, cost), those fields are merged into the top-level result.

**Demo**
```python
maps_search_detail("B000A8UIN8")
```

---

## Weather

### `maps_weather`

4-day forecast for a city.

| Param | Type | Required | Description |
|---|---|---|---|
| `city` | `str` | yes | City name or adcode |

**Returns**
```json
{
  "city": "北京市",
  "forecasts": [
    {
      "date": "2026-05-29",
      "week": "5",
      "dayweather": "晴",
      "nightweather": "晴",
      "daytemp": "32",
      "nighttemp": "17",
      "daywind": "西南",
      "nightwind": "西南",
      "daypower": "1-3",
      "nightpower": "1-3",
      "daytemp_float": "32.0",
      "nighttemp_float": "17.0"
    }
  ]
}
```

> `forecasts` is a **flat array** of cast objects (not nested under `casts`). `daytemp`/`nighttemp` are strings.

**Demo**
```python
maps_weather("北京")
maps_weather("110000")   # adcode also works
```

---

## Routing

All `_by_address` variants internally call `maps_geo` to resolve addresses to coordinates, then call the corresponding `_by_coordinates` variant. Prefer `_by_address` unless you already have coordinates.

### `maps_direction_walking_by_address` / `maps_direction_walking_by_coordinates`

Walking route, up to 100 km.

| Param | Type | Required | Description |
|---|---|---|---|
| `origin_address` | `str` | yes | Start address |
| `destination_address` | `str` | yes | End address |
| `origin_city` | `str` | no | City hint for origin geocoding |
| `destination_city` | `str` | no | City hint for destination geocoding |

`_by_coordinates` takes `origin: str` and `destination: str` (`"lng,lat"`) instead.

**Returns**
```json
{
  "route": {
    "origin": "116.397,39.919",
    "destination": "116.391,39.912",
    "paths": [
      {
        "distance": "3006",
        "duration": "2405",
        "steps": [
          {
            "instruction": "向北步行4米右转",
            "road": "景山前街",
            "distance": "4",
            "orientation": "北",
            "duration": "3"
          }
        ]
      }
    ]
  },
  "addresses": {
    "origin": {"address": "景山前街4号", "coordinates": "116.397,39.919"},
    "destination": {"address": "天安门广场", "coordinates": "116.391,39.912"}
  }
}
```

**Demo**
```python
maps_direction_walking_by_address("景山前街4号", "天安门广场", origin_city="北京")
```

---

### `maps_direction_driving_by_address` / `maps_direction_driving_by_coordinates`

Driving route. Considers traffic and road restrictions.

Same parameters and return shape as walking. `paths` additionally includes a `path` field (polyline string).

**Demo**
```python
maps_direction_driving_by_address(
    "北京市朝阳区阜通东大街6号",
    "北京市海淀区上地十街10号"
)
```

---

### `maps_direction_transit_integrated_by_address` / `maps_direction_transit_integrated_by_coordinates`

Public transit route (bus, subway, train). `origin_city` and `destination_city` are **required** (needed for cross-city routing).

| Param | Type | Required | Description |
|---|---|---|---|
| `origin_address` | `str` | yes | Start address |
| `destination_address` | `str` | yes | End address |
| `origin_city` | `str` | yes | Origin city |
| `destination_city` | `str` | yes | Destination city |

`_by_coordinates` takes `origin`, `destination`, `city`, `cityd` (all `str`).

**Returns**
```json
{
  "route": {
    "origin": "116.397,39.919",
    "destination": "116.310,39.983",
    "distance": "12000",
    "transits": [
      {
        "duration": "2400",
        "walking_distance": "800",
        "segments": [
          {
            "walking": {"distance": "300", "duration": "240", "steps": [...]},
            "bus": {
              "buslines": [
                {
                  "name": "地铁1号线",
                  "departure_stop": {"name": "天安门东"},
                  "arrival_stop": {"name": "木樨地"},
                  "distance": "8000",
                  "duration": "1200",
                  "via_stops": [{"name": "西单"}, {"name": "复兴门"}]
                }
              ]
            },
            "entrance": {"name": "天安门东站A口"},
            "exit": {"name": "木樨地站B口"},
            "railway": {"name": null, "trip": null}
          }
        ]
      }
    ]
  }
}
```

**Demo**
```python
maps_direction_transit_integrated_by_address(
    "天安门广场", "北京西站",
    origin_city="北京", destination_city="北京"
)
```

---

### `maps_bicycling_by_address` / `maps_bicycling_by_coordinates`

Cycling route, up to 500 km. Same parameters and return shape as walking.

**Demo**
```python
maps_bicycling_by_address("景山前街4号", "北海公园", origin_city="北京")
```

---

## Utilities

### `maps_distance`

Measure distance between one or more origins and a single destination.

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `origins` | `str` | yes | — | One or more `"lng,lat"` separated by `\|` |
| `destination` | `str` | yes | — | `"lng,lat"` |
| `type` | `str` | no | `"1"` | `"0"` straight-line, `"1"` driving, `"3"` walking |

**Returns**
```json
{
  "results": [
    {
      "origin_id": "1",
      "dest_id": "1",
      "distance": "3006",
      "duration": "360"
    }
  ]
}
```

**Demo**
```python
maps_distance("116.397,39.919", "116.391,39.912", type="3")
# Multiple origins:
maps_distance("116.397,39.919|116.310,39.983", "116.391,39.912", type="1")
```

---

### `maps_ip_location`

Locate a city from an IP address.

| Param | Type | Required | Description |
|---|---|---|---|
| `ip` | `str` | yes | IPv4 address |

**Returns**
```json
{
  "province": "北京市",
  "city": "北京市",
  "adcode": "110000",
  "rectangle": "116.0119343,39.66127144;116.7829835,40.2164962"
}
```

**Demo**
```python
maps_ip_location("114.247.50.2")
```

---

## Key Gotchas

- `maps_text_search` and `maps_around_search` **never return `location`**. To get coordinates for a search result, either call `maps_search_detail(poi_id)` or `maps_geo(address)`.
- `maps_weather` returns `forecasts` as a **flat array** of cast objects, not `forecasts[i].casts[]`.
- All `distance`/`duration` values in routing responses are **strings**, not numbers.
- Transit routing requires both `origin_city` and `destination_city` even for same-city trips.
