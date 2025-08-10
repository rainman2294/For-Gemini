export class ApiError extends Error {
  public statusCode: number;
  public response?: Response;
  public data?: any;

  constructor(message: string, statusCode: number, response?: Response, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
    this.data = data;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retryAttempts?: number;
  skipRetry?: boolean;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private defaultHeaders: Record<string, string>;
  private token: string | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 10000; // 10 seconds default
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second default
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.defaultHeaders,
    };
  }

  public setAuthToken(token: string | null): void {
    this.token = token;
  }

  public getAuthToken(): string | null {
    return this.token;
  }

  public getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.defaultHeaders, ...customHeaders };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    // WordPress specific nonce handling
    if (typeof window !== 'undefined' && window.pulse2?.nonce) {
      headers['X-WP-Nonce'] = window.pulse2.nonce;
    }

    return headers;
  }

  public async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public shouldRetry(error: ApiError, attempt: number, maxAttempts: number): boolean {
    if (attempt >= maxAttempts) return false;
    
    // Retry on network errors or 5xx server errors
    if (!error.statusCode || error.statusCode >= 500) return true;
    
    // Retry on specific 4xx errors
    if (error.statusCode === 408 || error.statusCode === 429) return true;
    
    return false;
  }

  public async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.timeout;
    const maxAttempts = options.retryAttempts ?? this.retryAttempts;
    const skipRetry = options.skipRetry || false;

    const { timeout: _, retryAttempts: __, skipRetry: ___, ...fetchOptions } = options;

    const headers = this.getHeaders(options.headers as Record<string, string>);

    let lastError: ApiError;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let responseData: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }

        if (!response.ok) {
          const error = new ApiError(
            responseData?.message || responseData || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response,
            responseData
          );

          if (skipRetry || !this.shouldRetry(error, attempt, maxAttempts)) {
            throw error;
          }

          lastError = error;
          await this.delay(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }

        return responseData;
      } catch (error) {
        if (error instanceof ApiError) {
          lastError = error;
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new ApiError('Request timeout', 408);
        } else {
          lastError = new ApiError(
            error instanceof Error ? error.message : 'Network error',
            0
          );
        }

        if (skipRetry || !this.shouldRetry(lastError, attempt, maxAttempts)) {
          throw lastError;
        }

        await this.delay(this.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError!;
  }

  // HTTP Methods
  public async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  public async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // File upload method
  public async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
    options?: RequestOptions
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers = this.getHeaders(options?.headers as Record<string, string>);
    delete headers['Content-Type']; // Let browser set content-type for FormData

    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers,
    });
  }

  // Batch requests
  public async batch<T>(requests: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(requests.map(request => request()));
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', { skipRetry: true, timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// WordPress API Client
export class WordPressApiClient extends ApiClient {
  constructor(config?: Partial<ApiClientConfig>) {
    super({
      baseUrl: config?.baseUrl || (typeof window !== 'undefined' && window.pulse2?.apiUrl) || '/wp-json/pulse2/v1',
      timeout: config?.timeout || 15000,
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000,
      defaultHeaders: {
        'Content-Type': 'application/json',
        ...config?.defaultHeaders,
      },
    });
  }

  // Project management methods
  public async getProjects<T>(): Promise<T[]> {
    return this.get<T[]>('/projects');
  }

  public async getProject<T>(id: string): Promise<T> {
    return this.get<T>(`/projects/${id}`);
  }

  public async createProject<T>(data: any): Promise<T> {
    return this.post<T>('/projects', data);
  }

  public async updateProject<T>(id: string, data: any): Promise<T> {
    return this.put<T>(`/projects/${id}`, data);
  }

  public async deleteProject<T>(id: string): Promise<T> {
    return this.delete<T>(`/projects/${id}`);
  }

  // Workspace management methods
  public async getWorkspaces<T>(): Promise<T[]> {
    return this.get<T[]>('/workspaces');
  }

  public async getWorkspacesByProject<T>(projectId: string): Promise<T[]> {
    return this.get<T[]>(`/workspaces/project/${projectId}`);
  }

  public async createWorkspace<T>(data: any): Promise<T> {
    return this.post<T>('/workspaces', data);
  }

  public async updateWorkspace<T>(id: string, data: any): Promise<T> {
    return this.put<T>(`/workspaces/${id}`, data);
  }

  public async deleteWorkspace<T>(id: string): Promise<T> {
    return this.delete<T>(`/workspaces/${id}`);
  }

  // Media management methods
  public async getMedia<T>(id: string): Promise<T> {
    return this.get<T>(`/media/${id}`);
  }

  public async uploadMedia<T>(file: File, additionalData?: Record<string, string>): Promise<T> {
    const mediaUrl = typeof window !== 'undefined' && window.pulse2?.mediaUrl 
      ? window.pulse2.mediaUrl 
      : '/wp-json/wp/v2/media';
    
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const headers = this.getHeaders();
    delete headers['Content-Type']; // Let browser set content-type for FormData

    return this.makeRequest<T>(mediaUrl, {
      method: 'POST',
      body: formData,
      headers,
      timeout: 30000, // Longer timeout for uploads
    });
  }

  // Enhanced workspace image upload with better error handling
  public async uploadWorkspaceImage<T>(workspaceId: string, file: File, additionalData?: Record<string, string>): Promise<T> {
    try {
      // First try WordPress media upload
      const mediaResponse = await this.uploadMedia<any>(file, additionalData);
      
      // Then associate with workspace
      const workspaceData = {
        imageId: mediaResponse.id,
        imageUrl: mediaResponse.source_url,
        filename: file.name,
        ...additionalData
      };
      
      return this.post<T>(`/workspaces/${workspaceId}/images`, workspaceData);
    } catch (error) {
      console.error('Workspace image upload failed:', error);
      throw error;
    }
  }
}

// Default instances
export const apiClient = new ApiClient({
  baseUrl: '/api',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
});

export const wpApiClient = new WordPressApiClient();

// Hook for using API client in components
export const useApiClient = () => {
  return {
    apiClient,
    wpApiClient,
    ApiError,
  };
};