import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// OpenCage API configuration
const OPENCAGE_API_URL = 'https://api.opencagedata.com/geocode/v1/json';
const HEADERS = {
  'User-Agent': 'opencage-geocoding-mcp',
};
const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;
if (!OPENCAGE_API_KEY) {
  console.error('OPENCAGE_API_KEY environment variable is required');
  process.exit(1);
}
// tools
const GEOCODE = 'geocode-forward';
const REVERSE_GEOCODE = 'geocode-reverse';
const GET_OPENCAGE_INFO = 'get-opencage-info';

export interface OpenCageResponse {
  results: Array<{
    annotations: {
      timezone: {
        name: string;
      };
      flag: string;
      currency: {
        name: string;
        iso_code: string;
      };
      [key: string]: string | number | boolean | object | undefined;
    };
    components: {
      country: string;
      city?: string;
      state?: string;
      county?: string;
      suburb?: string;
      road?: string;
      house_number?: string;
      postcode?: string;
      [key: string]: string | number | boolean | object | undefined;
    };
    confidence: number;
    formatted: string;
    geometry: {
      lat: number;
      lng: number;
    };
  }>;
  status: {
    code: number;
    message: string;
  };
  total_results: number;
}

export class OpenCageServer {
  private server: Server;

  /**
   * ctor.
   */
  constructor() {
    this.server = new Server(
      {
        name: 'opencage-geocoding',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      },
    );

    this.setupToolHandlers();
  }

  /**
   * Handles the geocoding request.
   *
   * @param args - The arguments for the request.
   * @returns The response containing the geocoded location information.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleGeocode(args: any) {
    const {
      query,
      language = 'en',
      countrycode,
      bounds,
      limit = 5,
    } = args || {};

    try {
      const params = new URLSearchParams({
        q: query,
        key: OPENCAGE_API_KEY!,
        language,
        limit: limit.toString(),
        no_annotations: '0',
      });

      if (countrycode) {
        params.append('countrycode', countrycode);
      }
      if (bounds) {
        params.append('bounds', bounds);
      }

      const url = `${OPENCAGE_API_URL}?${params}`;
      const response = await fetch(url, { headers: HEADERS });
      const data: OpenCageResponse = await response.json();

      if (data.status.code !== 200) {
        throw new Error(`OpenCage API error: ${data.status.message}`);
      }

      if (data.total_results === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No results found for "${query}"`,
            },
          ],
        };
      }

      const results = data.results.map((result) => ({
        formatted: result.formatted,
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        confidence: result.confidence,
        flag: result.annotations?.flag,
        timezone: result.annotations?.timezone,
        currency: result.annotations?.currency,
        annotations: result.annotations,
        components: result.components,
      }));

      return {
        content: [
          {
            type: 'text',
            text:
              `Found ${
                data.total_results
              } result(s) for "${query}"::\n\n${results
                .map(
                  (r, i: number) =>
                    `${i + 1}. ${r.formatted}\n` +
                    `   Coordinates: ${r.latitude}, ${r.longitude}\n` +
                    `   Flag: ${r.flag}\n` +
                    `   Timezone: ${r.timezone.name}\n` +
                    `   Currency: ${r.currency.name} (${r.currency.iso_code})`,
                )
                .join('\n\n')}` +
              `\n\nLink to the full API response:\n${url}\nCopy/paste this link to view the full response.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error geocoding "${query}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handles the reverse geocoding request.
   *
   * @param args - The arguments for the request.
   * @returns The response containing the address and location information.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleReverseGeocode(args: any) {
    const { latitude, longitude, language = 'en', no_annotations } = args;

    const params = new URLSearchParams({
      q: `${latitude},${longitude}`,
      key: OPENCAGE_API_KEY!,
      language,
      limit: '1',
    });

    if (no_annotations) {
      params.append('no_annotations', '1');
    }

    const url = `${OPENCAGE_API_URL}?${params}`;

    const response = await fetch(url);
    const data: OpenCageResponse = await response.json();

    if (data.status.code !== 200) {
      throw new Error(`OpenCage API error: ${data.status.message}`);
    }

    if (data.total_results === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No address found for coordinates ${latitude}, ${longitude}`,
          },
        ],
      };
    }

    const result = data.results[0];
    const info = {
      formatted: result.formatted,
      components: result.components,
      flag: result.annotations?.flag,
      timezone: result.annotations?.timezone,
      currency: result.annotations?.currency,
      ...(result.annotations &&
        !no_annotations && { annotations: result.annotations }),
    };

    return {
      content: [
        {
          type: 'text',
          text:
            `Reverse geocoding for coordinates ${latitude}, ${longitude}:\n\n` +
            `Address: ${info.formatted}\n` +
            `Flag: ${info.flag}\n` +
            `Timezone: ${info.timezone.name}\n` +
            `Currency: ${info.currency.name} (${info.currency.iso_code})\n` +
            `\n\nLink to the full API response:\n${url}\nCopy/paste this link to view the full response.`,
        },
      ],
    };
  }

  /**
   * Handles the OpenCage API info request.
   * @param _args - The arguments for the request.
   * @returns The response containing API usage and rate limit information.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  private async handleOpenCageInfo(_args: any) {
    try {
      const params = new URLSearchParams({
        q: `0,0`,
        key: OPENCAGE_API_KEY!,
        limit: '1',
      });
      const url = `${OPENCAGE_API_URL}?${params}`;
      console.error(`Testing API with URL: ${url}`); // Debug log
      const response = await fetch(url, { headers: HEADERS });
      const headers = response.headers;
      const remaining = headers.get('x-ratelimit-remaining');
      const limit = headers.get('x-ratelimit-limit');
      const reset = headers.get('x-ratelimit-reset');

      let statusText = 'OpenCage API Info:\n\n';

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
            type: 'text',
            text: statusText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error checking API status: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Sets up the handlers for the OpenCage server.
   */
  private setupToolHandlers() {
    // List Tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: GEOCODE,
            description:
              'Convert an address or place name to geographic coordinates (latitude/longitude)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description:
                    'The address, place name, or location to geocode',
                },
                language: {
                  type: 'string',
                  description: "Language for results (e.g., 'en', 'de', 'fr')",
                  default: 'en',
                },
                countrycode: {
                  type: 'string',
                  description:
                    'Restrict results to specific country (ISO 3166-1 alpha-2 code)',
                },
                bounds: {
                  type: 'string',
                  description:
                    'Bounding box to restrict results (min_lon,min_lat,max_lon,max_lat)',
                },
                limit: {
                  type: 'number',
                  minimum: 1,
                  maximum: 100,
                  description: 'Maximum number of results (1-100, default 10)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: REVERSE_GEOCODE,
            description:
              'Convert geographic coordinates (latitude/longitude) to an address or place name',
            inputSchema: {
              type: 'object',
              properties: {
                latitude: {
                  type: 'number',
                  description: 'Latitude coordinate',
                  minimum: -90,
                  maximum: 90,
                },
                longitude: {
                  type: 'number',
                  description: 'Longitude coordinate',
                  minimum: -180,
                  maximum: 180,
                },
                language: {
                  type: 'string',
                  description:
                    "Language code for results (e.g., 'en', 'es', 'fr')",
                  default: 'en',
                },
                no_annotations: {
                  type: 'boolean',
                  description: 'Exclude additional metadata annotations',
                },
              },
              required: ['latitude', 'longitude'],
            },
          },
          {
            name: GET_OPENCAGE_INFO,
            description:
              'Get current API usage and rate limit information for your OpenCage API key',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // CallToolRequestSchema
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case GEOCODE:
            return await this.handleGeocode(args);
          case REVERSE_GEOCODE:
            return await this.handleReverseGeocode(args);
          case GET_OPENCAGE_INFO:
            return await this.handleOpenCageInfo(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });

    // ListPromptsRequestSchema
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'geocoding-assistant',
            description:
              'Help users with geocoding tasks - converting between addresses and coordinates',
            arguments: [
              {
                name: 'task',
                description: 'The geocoding task to help with',
                required: true,
              },
            ],
          },
        ],
      };
    });

    // Handle prompt requests
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      if (request.params.name === 'geocoding-assistant') {
        const task = request.params.arguments?.task || 'general geocoding';

        return {
          description: 'Geocoding assistant prompt',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `I need help with a geocoding task: ${task}

Please help me understand what I can do with the OpenCage geocoding API through this MCP server:

1. Forward Geocoding: Convert addresses/place names to coordinates
2. Reverse Geocoding: Convert coordinates to addresses
3. Check API info: status and rate limits

Available tools:
- geocode-forward: Convert address → coordinates
- geocode-reverse: Convert coordinates → address  
- get-opencage-info: Check API usage

What would you like to help me with regarding geocoding?`,
              },
            },
          ],
        };
      }

      throw new Error(`Unknown prompt: ${request.params.name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenCage Geocoding MCP Server running on stdio');
  }
}

// Start the server
const server = new OpenCageServer();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.run().catch((error: any) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
