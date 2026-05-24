export interface ServerConfig {
  port: number;
  prefix: string;
  addresses: string[];
  https?: number;
}

export interface ConnectionResult {
  url: string;
  latency: number;
}

/**
 * Base64 decode server address code to get server configuration
 */
export function decodeServerCode(code: string): ServerConfig | null {
  try {
    // Handle URL-safe base64
    const normalized = code
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padding = normalized.length % 4;
    const padded = padding ? normalized + '='.repeat(4 - padding) : normalized;
    
    const decoded = atob(padded);
    const config: ServerConfig = JSON.parse(decoded);
    
    // Validate required fields
    if (
      typeof config.port !== 'number' ||
      typeof config.prefix !== 'string' ||
      !Array.isArray(config.addresses) ||
      config.addresses.length === 0
    ) {
      return null;
    }
    
    return config;
  } catch {
    return null;
  }
}

/**
 * Test a single server URL and return latency if successful
 */
async function testServerUrl(url: string): Promise<number | null> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok || response.status === 404) {
      return Date.now() - startTime;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Find the best working server from the configuration
 * Tests all addresses and returns the one with lowest latency
 */
export async function findBestServer(config: ServerConfig): Promise<ConnectionResult | null> {
  const protocol = config.https === 1 ? 'https' : 'http';
  const testPromises = config.addresses.map(async (address) => {
    const url = `${protocol}://${address}:${config.port}${config.prefix}`;
    const latency = await testServerUrl(url);
    return latency !== null ? { url, latency } : null;
  });
  
  const results = await Promise.all(testPromises);
  const validResults = results.filter((r): r is ConnectionResult => r !== null);
  
  if (validResults.length === 0) {
    return null;
  }
  
  // Return the server with lowest latency
  return validResults.reduce((best, current) =>
    current.latency < best.latency ? current : best
  );
}
