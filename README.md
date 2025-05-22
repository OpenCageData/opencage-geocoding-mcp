# OpenCage Geocoding MCP Server

An MCP (Model Context Protocol) server that provides geocoding capabilities using the [OpenCage geocoding API](https://opencagedata.com/api).
This server allows you to convert between addresses and geographic coordinates.

## Features

- **Forward Geocoding**: Convert addresses or place names to coordinates (latitude/longitude)
- **Reverse Geocoding**: Convert coordinates to addresses
- **API Status Monitoring**: Check your API usage and rate limits
- **Flexible Parameters**: Support for language preferences, country restrictions, and result limits

## Prerequisites

1. **Node.js** (version 16 or higher)
2. **OpenCage API Key**: Sign up on [the OpenCage website](https://opencagedata.com/) to get a free-trial geocoding API key

## Installation

1. Clone or create the project directory:
```bash
mkdir mcp-opencage-server
cd mcp-opencage-server
```

2. Create the package.json, tsconfig.json, and source files as provided

3. Install dependencies:
```bash
npm install
```

4. Set your OpenCage geocoding API key as an environment variable:
```bash
export OPENCAGE_API_KEY="your_api_key_here"
```

5. Build the project:
```bash
npm run build
```

## Usage

### Testing the Server

You can test the server directly:
```bash
npm run dev
```

### Using with Claude Desktop

Add this configuration to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "opencage-geocoding": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/YOUR/PROJECT/build/index.js"],
      "env": {
        "OPENCAGE_API_KEY": "your_opencage_geocoding_api_key_here"
      }
    }
  }
}
```

## Available Tools

### 1. geocode-forward
Convert an address or place name to coordinates and information about that location.

**Parameters:**
- `query` (required): The address or place name to geocode
- `countrycode` (optional): Restrict to country (ISO 3166-1 alpha-2 code)
- `bounds` (optional): Bounding box (min_lon,min_lat,max_lon,max_lat)
- `language` (optional): Language for results (e.g., 'en', 'de', 'fr')
- `limit` (optional): Max results (1-100, default 10)
- `no_annotations` (optional): Exclude location annotations

**Example:**
```
Query: "1600 Pennsylvania Avenue, Washington, DC"
Result: JSON with coordinates, formatted address, confidence score, address components, annotations
```

### 2. geocode-reverse
Convert coordinates to an address and information about that location

**Parameters:**
- `latitude` (required): Latitude coordinate (-90 to 90) in decimal format
- `longitude` (required): Longitude coordinate (-180 to 180) in decimal format
- `language` (optional): Language for results
- `no_annotations` (optional): Exclude location annotations

**Example:**
```
Input: 38.8976, -77.0365
Result: "1600 Pennsylvania Avenue NW, Washington, DC 20500, United States of America"
```

### 3. get-api-status
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
- [Model Context Protocol](https://modelcontextprotocol.io/) - Learn more about MCP

### Who is OpenCage GmbH?

<a href="https://opencagedata.com"><img src="opencage_logo_300_150.png"></a>

We run a worldwide [geocoding API](https://opencagedata.com/api) and [geosearch](https://opencagedata.com/geosearch) service based on open data. 
Learn more [about us](https://opencagedata.com/about). 

We also organize [Geomob](https://thegeomob.com), a series of regular meetups for location based service creators, where we do our best to highlight geoinnovation. If you like geo stuff, you will probably enjoy [the Geomob podcast](https://thegeomob.com/podcast/).

