
interface AdminTokenResponse {
  token: string;
}

class AdminTokenService {
  private currentToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  async getAdminToken(): Promise<string> {
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = this.acquireToken();

    try {
      const token = await this.tokenPromise;
      this.currentToken = token;
      return token;
    } finally {
      this.tokenPromise = null;
    }
  }

  private async acquireToken(): Promise<string> {
    try {
      const { auth } = await import('../../config/firebase');
      const { getIdToken } = await import('firebase/auth');

      if (!auth?.currentUser) {
        throw new Error('No authenticated user available');
      }

      const firebaseToken = await getIdToken(auth.currentUser);

      const sessionApiUrl = this.getSessionApiUrl();

      const response = await fetch(`${sessionApiUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to acquire admin token: ${response.status} ${response.statusText}`);
      }

      const data: AdminTokenResponse = await response.json();

      if (!data.token) {
        throw new Error('No token received from Session service');
      }

      return data.token;
    } catch (error) {
      console.error('Failed to acquire admin token:', error);
      throw error;
    }
  }

  private getSessionApiUrl(): string {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? 'http://localhost:8003' : 'https://api.turnkeyhms.com';
  }

  async refreshToken(): Promise<string> {
    this.currentToken = null;
    return this.getAdminToken();
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }

  clearToken(): void {
    this.currentToken = null;
    this.tokenPromise = null;
  }
}

export const adminTokenService = new AdminTokenService();