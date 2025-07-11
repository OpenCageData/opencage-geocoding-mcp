# OpenCage Geocoding MCP Server

An MCP (Model Context Protocol) server that provides geocoding capabilities using the [OpenCage geocoding API](https://opencagedata.com/api).
This server allows you to convert between addresses and geographic coordinates.

**PLEASE NOTE:** the examples shown here are based on an integration with [claude.ai](https://claude.ai/)'s desktop client. MCP as a concept is supported by other services, but may require a slightly different configuration.

## Features

- **Forward Geocoding**: Convert addresses or place names to coordinates (latitude/longitude)
- **Reverse Geocoding**: Convert coordinates to addresses
- **API Status Monitoring**: Check your API usage and rate limits (assuming your penCage account has hard limits).

## Prerequisites

1. **Node.js** (version 20 or higher)
2. **OpenCage geocoding API Key**: Sign up on [the OpenCage website](https://opencagedata.com/) to get a free-trial geocoding API key

## Installation

1. Clone the repository. Change into the repository directory

```bash

git clone git@github.com:OpenCageData/opencage-geocoding-mcp.git
# or
git clone https://github.com/OpenCageData/opencage-geocoding-mcp.git

cd opencage-geocoding-mcp
```

2. Install dependencies:

```bash
npm install
```

This is enough to get the MCP working with Claude Desktop (see below)

If you want to develop the MCP and plan to query the MCP from the command line 
you will also need to:


3. Set your OpenCage geocoding API key as an environment variable:

```bash
export OPENCAGE_API_KEY="your_opencage_geocoding_api_key_here"
```

4. Build the project:

```bash
npm run build
```

## Usage

### Using within Claude Desktop

Add this configuration to your Claude Desktop config file

On a Mac the config file should be (`~/Library/Application Support/Claude/claude_desktop_config.json`), but you can also navigate to the file via the menu: `Settings > Developer > Edit Config`

```json
{
  "mcpServers": {
    "opencage-geocoding": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/opencage-geocoding-mcp/build/index.js"],
      "env": {
        "OPENCAGE_API_KEY": "your_opencage_geocoding_api_key_here"
      }
    }
  }
}
```

## Available Tools

Note: the first time you run a command you will need to give Claude permission

![Allow external integration](allow-external-integration.png)

### 1. geocode-forward

Convert an address or place name to coordinates and information about that location.

**Parameters:**

- `query` (required): The address or place name to geocode
- `countrycode` (optional): Restrict to country (ISO 3166-1 alpha-2 code)
- `bounds` (optional): Bounding box (min_lon,min_lat,max_lon,max_lat)
- `language` (optional): Language for results (e.g., 'en', 'de', 'fr')
- `limit` (optional): Max results (1-100, default 10)
- `no_annotations` (optional): Exclude location annotations

**Example prompts**

```
Prompt: "What are the coordinates of Trafalgar Square, London?"
Result: coordinates, timezone, local currency, etc

Prompt: "Where is Les Vans, France? Which Department is it in?"
Result: coordinates, and correct answer that Les Vans is in the Ardèche department

Prompt: "In welchem Bundesland liegt Weimar?"
Result: coordinates, and correct answer that Weimar is in Thüringen

```

### 2. geocode-reverse

Convert coordinates to an address and information about that location

**Parameters:**

- `latitude` (required): Latitude coordinate (-90 to 90) in decimal format
- `longitude` (required): Longitude coordinate (-180 to 180) in decimal format
- `language` (optional): Language for results
- `no_annotations` (optional): Exclude location annotations

**Example prompts**

```
Prompt: "what is the address at 38.8976, -77.0365?"
Result: "1600 Pennsylvania Avenue NW, Washington, DC 20500, United States of America"

Prompt: "Which province are the coordinates 41.38700, 2.16995 in?"
Result: "Coordinates are in Barcelona in the province of Catalonia"

```

### 3. get-opencage-info

Check your current API usage and rate limits.
**NOTE**: subscription customers do NOT have hard usage limits. See [relevant documentation](https://opencagedata.com/api#rate-limiting).

**Parameters:** None

**Returns:** Information about remaining requests, rate limits, and reset times.

## Available Prompts

### geocoding-assistant

A helpful assistant for geocoding tasks. Provides guidance on using the geocoding tools effectively.

## Error Handling

The server includes comprehensive error handling:

- Invalid API keys
- Rate limit exceeded
- Network errors
- Invalid coordinates or addresses
- API service unavailable

## Environment Variables

- `OPENCAGE_API_KEY`: Your OpenCage geocoding API key (required)

## Troubleshooting

1. **"API key required" error**: Make sure the env var `OPENCAGE_API_KEY` is set
2. **"No results found"**: Try a more specific or different address format, see [the OpenCage guide to query formatting](https://opencagedata.com/guides/how-to-format-your-geocoding-query)
3. **Rate limit errors**: Check your API usage with `get-api-status` tool
4. **Network errors**: Verify internet connection or [the public OpenCage status page](https://status.opencagedata.com/)

## Relevant Links

- [OpenCage homepage](https://opencagedata.com/) - Get your geocoding API key
- [OpenCage API Documentation](https://opencagedata.com/api) - Full OpenCage geocoding API reference
- [OpenCage MCP tutorial](https://opencagedata.com/tutorials/geocode-inside-an-llm-via-mcp)

- [Model Context Protocol](https://modelcontextprotocol.io/) - Learn more about MCP

### Who is OpenCage GmbH?

<a href="https://opencagedata.com"><img src="opencage_logo_300_150.png"></a>

We run a worldwide [geocoding API](https://opencagedata.com/api) and [geosearch](https://opencagedata.com/geosearch) service based on open data.
Learn more [about us](https://opencagedata.com/about).

We also organize [Geomob](https://thegeomob.com), a series of regular meetups for location based service creators, where we do our best to highlight geoinnovation. If you like geo stuff, you will probably enjoy [the Geomob podcast](https://thegeomob.com/podcast/).
