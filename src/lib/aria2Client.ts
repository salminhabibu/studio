// src/lib/aria2Client.ts
import { config as serverConfig } from '@/server/config';

export interface Aria2File {
  index: string;
  path: string;
  length: string;
  completedLength: string;
  selected: 'true' | 'false';
  uris: Array<{ uri: string; status: string }>;
}

export interface Aria2StatusResponse {
  gid: string;
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed';
  totalLength: string;
  completedLength: string;
  downloadSpeed: string;
  uploadSpeed: string;
  connections?: string;
  numSeeders?: string;
  eta?: string;
  errorCode?: string;
  errorMessage?: string;
  bittorrent?: {
    info?: {
      name?: string;
    };
    // ... other bittorrent specific fields
  };
  files: Aria2File[];
  // Add other fields as necessary from aria2.tellStatus response
}

interface Aria2Error {
  code: number;
  message: string;
}

interface Aria2JsonResponse<T> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: Aria2Error;
}

export class Aria2Client {
  private rpcUrl: string;
  private secretToken?: string;
  private static instanceCounter = 0; // For unique request IDs

  constructor() {
    this.rpcUrl = serverConfig.aria2RpcUrl;
    this.secretToken = serverConfig.aria2SecretToken;

    if (this.secretToken === 'my_secret_token') {
        console.warn("[Aria2Client] Using default Aria2 secret token. Please change 'my_secret_token' in your .env file for production.");
    }
    console.log(`[Aria2Client] Initialized with RPC URL: ${this.rpcUrl} and secret token: ${this.secretToken ? '******' : 'None'}`);
  }

  private async makeRpcRequest<T = any>(method: string, params: any[] = []): Promise<T> {
    const requestId = `chillymovies-aria2-${Aria2Client.instanceCounter++}`;
    const payloadBody: any = {
      jsonrpc: '2.0',
      id: requestId,
      method: method,
      params: this.secretToken ? [`token:${this.secretToken}`, ...params] : params,
    };

    console.log(`[Aria2Client] Sending RPC request to ${this.rpcUrl} - Method: ${method}, Params: ${JSON.stringify(params)} (ID: ${requestId})`);

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      body: JSON.stringify(payloadBody),
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Aria2Client] RPC request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Aria2 RPC request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const jsonResponse: Aria2JsonResponse<T> = await response.json();
    
    console.log(`[Aria2Client] Received RPC response (ID: ${requestId}):`, jsonResponse.result ? 'Success' : 'Error/NoResult', jsonResponse.error || '');

    if (jsonResponse.error) {
      console.error(`[Aria2Client] Aria2 RPC Error: ${jsonResponse.error.message} (Code: ${jsonResponse.error.code})`);
      throw new Error(`Aria2 Error (${jsonResponse.error.code}): ${jsonResponse.error.message}`);
    }
    
    // It's valid for 'result' to be missing for some successful notifications (though Aria2 typically returns 'OK' or GID)
    // For methods that expect a result, the caller should handle the case where result might be unexpectedly undefined.
    // If a method like 'aria2.remove' returns "OK", 'OK' would be in jsonResponse.result.
    // If a method truly returns nothing on success and no error, jsonResponse.result would be undefined.
    // This behavior is fine; the key is handling jsonResponse.error.
    if (typeof jsonResponse.result === 'undefined' && !jsonResponse.error) {
        console.warn(`[Aria2Client] RPC response for method ${method} (ID: ${requestId}) did not contain a 'result' field, but no error was reported. This might be expected for certain methods.`);
    }

    return jsonResponse.result as T; 
  }

  async addUri(uri: string, options: Record<string, any> = {}): Promise<string> { // Returns GID
    return this.makeRpcRequest<string>('aria2.addUri', [[uri], options]);
  }

  async tellStatus(gid: string, keys?: string[]): Promise<Aria2StatusResponse> {
    const params: any[] = [gid];
    if (keys && keys.length > 0) { // Ensure keys is not empty if provided
        params.push(keys); 
    }
    return this.makeRpcRequest<Aria2StatusResponse>('aria2.tellStatus', params);
  }

  async pause(gid:string): Promise<string> { // Returns GID
    return this.makeRpcRequest<string>('aria2.pause', [gid]);
  }

  async unpause(gid: string): Promise<string> { // Returns GID
    return this.makeRpcRequest<string>('aria2.unpause', [gid]);
  }

  async remove(gid: string): Promise<string> { // Returns GID of removed download
    return this.makeRpcRequest<string>('aria2.remove', [gid]);
  }
  
  async getGlobalStat(): Promise<any> { // Return type is broad as it contains many fields
    return this.makeRpcRequest('aria2.getGlobalStat', []);
  }
}

const aria2Client = new Aria2Client();
export default aria2Client;
