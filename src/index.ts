#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// OpenCage API Configuration
const OPENCAGE_API_BASE = "https://api.opencagedata.com/geocode/v1";
const API_KEY = process.env.OPENCAGE_API_KEY;

if (!API_KEY) {
  console.error("Error: OPENCAGE_API_KEY environment variable is required");
  process.exit(1);
}

// Create server instance
const server = new McpServer({
  name: "opencage-geocoding",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
    prompts: {}
  },
});

// Helper function for making OpenCage API requests
async function makeOpenCageRequest(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(endpoint, OPENCAGE_API_BASE);
  url.searchParams.append("key", API_KEY);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`OpenCage API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error making OpenCage request:", error);
    throw error;
  }
}

// Tool: Forward Geocoding (address/place -> coordinates)
server.tool(
  "geocode-forward",
  "Convert an address or place name to geographic coordinates (latitude/longitude)",
  {
    query: z.string().describe("The address, place name, or location to geocode"),
    language: z.string().optional().describe("Language for results (e.g., 'en', 'de', 'fr')"),
    countrycode: z.string().optional().describe("Restrict results to specific country (ISO 3166-1 alpha-2 code)"),
    bounds: z.string().optional().describe("Bounding box to restrict results (min_lon,min_lat,max_lon,max_lat)"),
    limit: z.number().min(1).max(100).optional().describe("Maximum number of results (1-100, default 10)")
  },
  async ({ query, language, countrycode, bounds, limit }) => {
    try {
      const params: Record<string, string> = {
        q: query,
        format: "json"
      };

      if (language) params.language = language;
      if (countrycode) params.countrycode = countrycode;
      if (bounds) params.bounds = bounds;
      if (limit) params.limit = limit.toString();

      const response = await makeOpenCageRequest("/json", params);
      
      if (response.results && response.results.length > 0) {
        const results = response.results.map((result: any) => ({
          formatted: result.formatted,
          latitude: result.geometry.lat,
          longitude: result.geometry.lng,
          confidence: result.confidence,
          components: result.components,
          annotations: result.annotations
        }));

        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} result(s) for "${query}":\n\n${results.map((r, i) => 
                `${i + 1}. ${r.formatted}\n   Coordinates: ${r.latitude}, ${r.longitude}\n   Confidence: ${r.confidence}/10`
              ).join('\n\n')}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `No results found for "${query}"`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error geocoding "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Reverse Geocoding (coordinates -> address)
server.tool(
  "geocode-reverse",
  "Convert geographic coordinates (latitude/longitude) to an address or place name",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude coordinate"),
    longitude: z.number().min(-180).max(180).describe("Longitude coordinate"),
    language: z.string().optional().describe("Language for results (e.g., 'en', 'de', 'fr')"),
    no_annotations: z.boolean().optional().describe("Exclude additional metadata annotations")
  },
  async ({ latitude, longitude, language, no_annotations }) => {
    try {
      const params: Record<string, string> = {
        q: `${latitude},${longitude}`,
        format: "json"
      };

      if (language) params.language = language;
      if (no_annotations) params.no_annotations = "1";

      const response = await makeOpenCageRequest("/json", params);
      
      if (response.results && response.results.length > 0) {
        const result = response.results[0];
        const formattedResult = {
          formatted: result.formatted,
          components: result.components,
          confidence: result.confidence,
          ...(result.annotations && !no_annotations && { annotations: result.annotations })
        };

        return {
          content: [
            {
              type: "text",
              text: `Reverse geocoding for coordinates ${latitude}, ${longitude}:\n\n` +
                   `Address: ${formattedResult.formatted}\n` +
                   `Confidence: ${formattedResult.confidence}/10\n` +
                   `Components: ${JSON.stringify(formattedResult.components, null, 2)}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: `No address found for coordinates ${latitude}, ${longitude}`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error reverse geocoding ${latitude}, ${longitude}: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }
);

// Tool: Get API Usage/Rate Limit Info
server.tool(
  "get-api-status",
  "Get current API usage and rate limit information for your OpenCage API key",
  {},
  async () => {
    try {
      // Make a minimal request to get rate limit headers
      const response = await fetch(`${OPENCAGE_API_BASE}/json?key=${API_KEY}&q=0,0&limit=1`);
      
      const headers = response.headers;
      const remaining = headers.get('x-ratelimit-remaining');
      const limit = headers.get('x-ratelimit-limit');
      const reset = headers.get('x-ratelimit-reset');

      let statusText = "OpenCage API Status:\n\n";
      
      if (remaining && limit) {
        statusText += `Rate Limit: ${remaining}/${limit} requests remaining\n`;
      }
      
      if (reset) {
        const resetDate = new Date(parseInt(reset) * 1000);
        statusText += `Reset Time: ${resetDate.toISOString()}\n`;
      }

      statusText += `Response Status: ${response.status} ${response.statusText}`;

      return {
        content: [
          {
            type: "text",
            text: statusText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error checking API status: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  }
);

// Prompt: Geocoding Assistant
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "geocoding-assistant",
        description: "Help users with geocoding tasks - converting between addresses and coordinates",
        arguments: [
          {
            name: "task",
            description: "The geocoding task to help with",
            required: true
          }
        ]
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "geocoding-assistant") {
    const task = request.params.arguments?.task || "general geocoding";
    
    return {
      description: "Geocoding assistant prompt",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need help with a geocoding task: ${task}

Please help me understand what I can do with the OpenCage geocoding API through this MCP server:

1. Forward Geocoding: Convert addresses/place names to coordinates
2. Reverse Geocoding: Convert coordinates to addresses
3. Check API status and rate limits

Available tools:
- geocode-forward: Convert address → coordinates
- geocode-reverse: Convert coordinates → address  
- get-api-status: Check API usage

What would you like to help me with regarding geocoding?`
          }
        }
      ]
    };
  }
  
  throw new Error(`Unknown prompt: ${request.params.name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenCage Geocoding MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
