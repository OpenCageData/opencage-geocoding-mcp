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
            [key: string]: any;
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
            [key: string]: any;
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
export declare class OpenCageServer {
    private server;
    /**
     * ctor.
     */
    constructor();
    /**
     * Handles the geocoding request.
     * @param args - The arguments for the request.
     * @returns The response containing the geocoded location information.
     */
    private handleGeocode;
    /**
     * Handles the reverse geocoding request.
     * @param args - The arguments for the request.
     * @returns The response containing the address and location information.
     */
    private handleReverseGeocode;
    /**
     * Handles the OpenCage API info request.
     * @param args - The arguments for the request.
     * @returns The response containing API usage and rate limit information.
     */
    private handleOpenCageInfo;
    /**
     * Sets up the handlers for the OpenCage server.
     */
    private setupToolHandlers;
    run(): Promise<void>;
}
