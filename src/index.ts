#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema, 
  GetPromptRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';

// OpenCage API Configuration
const OPENCAGE_API_BASE = "https://api.opencagedata.com/geocode/v1";
const API_KEY = process.env.OPENCAGE_API_KEY;

if (!API_KEY) {
  console.error("Error: OPENCAGE_API_KEY environment variable is required");
  process.exit(1);
}

// Create server instance
const server = new Server({
  name: "opencage-geocoding",
  version: "1.0.0"
}, {
  capabilities: {
    resources: {},
    tools: {},
    prompts: {}
  }
});

// Helper function for making OpenCage API requests
async function makeOpenCageRequest(endpoint: string, params: Record<string, string>): Promise<any> {
  // Build the full URL properly
  const fullUrl = `${OPENCAGE_API_BASE}/${endpoint}`;
  const url = new URL(fullUrl);
  url.searchParams.append("key", API_KEY!);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  console.error(`Making request to: ${url.toString()}`); // Debug log
  
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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "geocode-forward",
        description: "Convert an address or place name to geographic coordinates (latitude/longitude)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The address, place name, or location to geocode"
            },
            language: {
              type: "string",
              description: "Language for results (e.g., 'en', 'de', 'fr')"
            },
            countrycode: {
              type: "string",
              description: "Restrict results to specific country (ISO 3166-1 alpha-2 code)"
            },
            bounds: {
              type: "string", 
              description: "Bounding box to restrict results (min_lon,min_lat,max_lon,max_lat)"
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 100,
              description: "Maximum number of results (1-100, default 10)"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "geocode-reverse",
        description: "Convert geographic coordinates (latitude/longitude) to an address or place name",
        inputSchema: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              minimum: -90,
              maximum: 90,
              description: "Latitude coordinate"
            },
            longitude: {
              type: "number", 
              minimum: -180,
              maximum: 180,
              description: "Longitude coordinate"
            },
            language: {
              type: "string",
              description: "Language for results (e.g., 'en', 'de', 'fr')"
            },
            no_annotations: {
              type: "boolean",
              description: "Exclude additional metadata annotations"
            }
          },
          required: ["latitude", "longitude"]
        }
      },
      {
        name: "get-api-status",
        description: "Get current API usage and rate limit information for your OpenCage API key",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "geocode-forward") {
    const { query, language, countrycode, bounds, limit } = (args as any) || {};
    
    try {
      const params: Record<string, string> = {
        q: query,
        format: "json"
      };

      if (language) params.language = language;
      if (countrycode) params.countrycode = countrycode;
      if (bounds) params.bounds = bounds;
      if (limit) params.limit = limit.toString();

      const response = await makeOpenCageRequest("json", params);
      
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
              text: `Found ${results.length} result(s) for "${query}":\n\n${results.map((r: any, i: number) => 
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
  
  if (name === "geocode-reverse") {
    const { latitude, longitude, language, no_annotations } = (args as any) || {};
    
    try {
      const params: Record<string, string> = {
        q: `${latitude},${longitude}`,
        format: "json"
      };

      if (language) params.language = language;
      if (no_annotations) params.no_annotations = "1";

      const response = await makeOpenCageRequest("json", params);
      
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
  
  if (name === "get-api-status") {
    try {
      // Make a minimal request to get rate limit headers
      const testUrl = `${OPENCAGE_API_BASE}/json?key=${API_KEY}&q=0,0&limit=1`;
      console.error(`Testing API with URL: ${testUrl}`); // Debug log
      const response = await fetch(testUrl);
      
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
  
  throw new Error(`Unknown tool: ${name}`);
});

// List available prompts
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

// Handle prompt requests
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