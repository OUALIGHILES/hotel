import crypto from 'crypto';

interface TuyaConfig {
  clientId: string;
  clientSecret: string;
  region?: 'cn' | 'us' | 'eu' | 'in' | 'sg';
}

interface AccessTokenResponse {
  success: boolean;
  result: {
    access_token: string;
    refresh_token: string;
    expire_time: number;
  };
  t: number;
}

interface Device {
  id: string;
  name: string;
  category: string;
  icon: string;
  ip: string;
  time_zone: string;
  active_time: number;
  create_time: number;
  update_time: number;
  owner_id: string;
  status: Array<{ code: string; value: any }>;
  functions: any[];
  panels: any[];
  product_id: string;
  product_name: string;
}

interface DeviceListResponse {
  success: boolean;
  result: {
    devices: Device[];
    total: number;
    page_no: number;
    page_size: number;
  };
  t: number;
}

interface DeviceStatus {
  code: string;
  value: any;
}

interface DeviceStatusResponse {
  success: boolean;
  result: DeviceStatus[];
  t: number;
}

interface CommandRequest {
  commands: Array<{
    code: string;
    value: any;
  }>;
}

interface CommandResponse {
  success: bool;
  t: number;
}

const REGION_ENDPOINTS = {
  cn: 'https://openapi.tuyacn.com',
  us: 'https://openapi.tuyaus.com', 
  eu: 'https://openapi.tuyaeu.com',
  in: 'https://openapi.tuyain.com',
  sg: 'https://openapi-sg.iotbing.com'
};

export class TuyaService {
  private config: TuyaConfig;
  private baseUrl: string;
  
  constructor(config: TuyaConfig) {
    this.config = config;
    this.baseUrl = REGION_ENDPOINTS[config.region || 'us'];
  }

  /**
   * Generate signature for Tuya API request
   */
  private generateSignature(method: string, url: string, params: any, body?: string, accessToken?: string): string {
    const { clientId, clientSecret } = this.config;
    
    // Timestamp in milliseconds
    const timestamp = Date.now().toString();
    
    // Sort query parameters alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}${params[key]}`)
      .join('');
    
    // Create string to sign
    let stringToSign = '';
    
    if (method === 'GET') {
      stringToSign = `${clientId}${timestamp}${sortedParams}`;
    } else if (method === 'POST') {
      const bodyHash = body ? crypto.createHash('sha256').update(body).digest('hex') : '';
      stringToSign = `${clientId}${accessToken || ''}${timestamp}POST${bodyHash}${sortedParams}`;
    }
    
    // Generate signature using HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', clientSecret)
      .update(stringToSign)
      .digest('hex')
      .toUpperCase();
    
    return signature;
  }

  /**
   * Get access token
   */
  public async getAccessToken(): Promise<string> {
    const timestamp = Date.now().toString();
    const stringToSign = `${this.config.clientId}${timestamp}`;
    
    const signature = crypto
      .createHmac('sha256', this.config.clientSecret)
      .update(stringToSign)
      .digest('hex')
      .toUpperCase();
    
    const response = await fetch(`${this.baseUrl}/v1.0/token?grant_type=1`, {
      method: 'GET',
      headers: {
        'client_id': this.config.clientId,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        'lang': 'en'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }
    
    const data: AccessTokenResponse = await response.json();
    
    if (!data.success) {
      throw new Error(`Tuya API error: ${JSON.stringify(data)}`);
    }
    
    return data.result.access_token;
  }

  /**
   * Get list of devices
   */
  public async getDevices(accessToken: string, pageNo: number = 1, pageSize: number = 100): Promise<Device[]> {
    const timestamp = Date.now().toString();
    const params = {
      page_no: pageNo.toString(),
      page_size: pageSize.toString()
    };

    const signature = this.generateSignature('GET', `${this.baseUrl}/v1.0/devices`, params);

    const queryParams = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/v1.0/devices?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'client_id': this.config.clientId,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        'access_token': accessToken,
        'lang': 'en'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get devices: ${response.status} ${response.statusText}`);
    }

    const data: DeviceListResponse = await response.json();

    if (!data.success) {
      throw new Error(`Tuya API error: ${JSON.stringify(data)}`);
    }

    return data.result.devices;
  }

  /**
   * Get device details by ID
   */
  public async getDeviceDetails(deviceId: string, accessToken: string): Promise<Device> {
    const timestamp = Date.now().toString();
    const path = `/v1.0/devices/${deviceId}`;
    const signature = this.generateSignature('GET', `${this.baseUrl}${path}`, {});

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'client_id': this.config.clientId,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        'access_token': accessToken,
        'lang': 'en'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get device details: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Tuya API error: ${JSON.stringify(data)}`);
    }

    return data.result as Device;
  }

  /**
   * Get device status
   */
  public async getDeviceStatus(deviceId: string, accessToken: string): Promise<DeviceStatus[]> {
    const timestamp = Date.now().toString();
    const path = `/v1.0/devices/${deviceId}/status`;
    const signature = this.generateSignature('GET', `${this.baseUrl}${path}`, {});

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'client_id': this.config.clientId,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        'access_token': accessToken,
        'lang': 'en'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get device status: ${response.status} ${response.statusText}`);
    }

    const data: DeviceStatusResponse = await response.json();

    if (!data.success) {
      throw new Error(`Tuya API error: ${JSON.stringify(data)}`);
    }

    return data.result;
  }

  /**
   * Send command to device
   */
  public async sendCommand(deviceId: string, commands: CommandRequest, accessToken: string): Promise<boolean> {
    const timestamp = Date.now().toString();
    const path = `/v1.0/devices/${deviceId}/commands`;
    const body = JSON.stringify(commands);
    
    const signature = this.generateSignature('POST', `${this.baseUrl}${path}`, {}, body, accessToken);

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'client_id': this.config.clientId,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        'access_token': accessToken,
        'lang': 'en',
        'Content-Type': 'application/json'
      },
      body: body
    });

    if (!response.ok) {
      throw new Error(`Failed to send command to device: ${response.status} ${response.statusText}`);
    }

    const data: CommandResponse = await response.json();

    return data.success;
  }

  /**
   * Get device specification
   */
  public async getDeviceSpecification(deviceId: string, accessToken: string) {
    const timestamp = Date.now().toString();
    const path = `/v1.0/devices/${deviceId}/specifications`;
    const signature = this.generateSignature('GET', `${this.baseUrl}${path}`, {});

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'client_id': this.config.clientId,
        'sign': signature,
        'sign_method': 'HMAC-SHA256',
        't': timestamp,
        'access_token': accessToken,
        'lang': 'en'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get device specifications: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Tuya API error: ${JSON.stringify(data)}`);
    }

    return data.result;
  }
}

// Export a function to create a configured Tuya service
export const createTuyaService = (config: TuyaConfig): TuyaService => {
  return new TuyaService(config);
};