import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { GrafanaRedirect } from '../../src/components/GrafanaRedirect';
import { AuthProvider } from '../../src/contexts/AuthContext';

// Mock the auth context
jest.mock('../../src/contexts/AuthContext', () => ({
  ...jest.requireActual('../../src/contexts/AuthContext'),
  useAuth: jest.fn(),
}));

// Window and location are mocked in setupTests.ts

describe('Grafana Integration', () => {
  const mockGetIdToken = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';

    // Mock useNavigate
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));
  });

  describe('GrafanaRedirect Component', () => {
    it('should redirect to Grafana when user is authenticated', async () => {
      const mockToken = 'mock-firebase-token-123';
      const mockUser = {
        uid: 'user123',
        email: 'admin@turnkeyhms.com',
        displayName: 'Admin User',
        role: 'admin',
      };

      const { useAuth } = require('../../src/contexts/AuthContext');
      useAuth.mockReturnValue({
        user: mockUser,
        getIdToken: mockGetIdToken.mockResolvedValue(mockToken),
        isAuthenticated: true,
      });

      render(
        <BrowserRouter>
          <GrafanaRedirect />
        </BrowserRouter>
      );

      // Should show loading state initially
      expect(screen.getByText('Loading Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Redirecting to Grafana...')).toBeInTheDocument();

      // Wait for redirect
      await waitFor(() => {
        expect(mockGetIdToken).toHaveBeenCalled();
      });

      // Check token was stored
      expect(sessionStorage.getItem('firebaseToken')).toBe(mockToken);

      // Check redirect happened
      expect(window.location.href).toBe('/analytics/grafana/d/turnkey-main');
    });

    it('should show error and redirect to login when user is not authenticated', async () => {
      const { useAuth } = require('../../src/contexts/AuthContext');
      useAuth.mockReturnValue({
        user: null,
        getIdToken: mockGetIdToken,
        isAuthenticated: false,
      });

      render(
        <BrowserRouter>
          <GrafanaRedirect />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('You must be logged in to access analytics')).toBeInTheDocument();
      });

      // Should redirect to login after delay
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      }, { timeout: 3000 });
    });

    it('should handle token retrieval errors gracefully', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'admin@turnkeyhms.com',
      };

      const { useAuth } = require('../../src/contexts/AuthContext');
      useAuth.mockReturnValue({
        user: mockUser,
        getIdToken: mockGetIdToken.mockRejectedValue(new Error('Token expired')),
        isAuthenticated: true,
      });

      render(
        <BrowserRouter>
          <GrafanaRedirect />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics dashboard. Please try again.')).toBeInTheDocument();
      });

      // Should redirect back to dashboard after error
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      }, { timeout: 4000 });
    });
  });

  describe('Navigation Integration', () => {
    it('should navigate to Grafana when Analytics button is clicked', async () => {
      const { Layout } = require('../../src/components/Layout');
      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AuthProvider>
            <Layout currentPage="overview">
              <div>Test Content</div>
            </Layout>
          </AuthProvider>
        </BrowserRouter>
      );

      // Find and click Analytics button
      const analyticsButton = screen.getByRole('button', { name: /Analytics/i });
      await user.click(analyticsButton);

      // Should navigate to Grafana route
      expect(mockNavigate).toHaveBeenCalledWith('/analytics/grafana/');
    });
  });

  describe('Role-Based Access', () => {
    it('should include role claim in token for Grafana', async () => {
      const mockUser = {
        uid: 'user123',
        email: 'viewer@turnkeyhms.com',
        role: 'viewer', // Lower privilege role
      };

      const { useAuth } = require('../../src/contexts/AuthContext');
      const mockTokenWithRole = 'eyJ...role:viewer...'; // Mock JWT with role

      useAuth.mockReturnValue({
        user: mockUser,
        getIdToken: mockGetIdToken.mockResolvedValue(mockTokenWithRole),
        isAuthenticated: true,
      });

      render(
        <BrowserRouter>
          <GrafanaRedirect />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetIdToken).toHaveBeenCalled();
        expect(sessionStorage.getItem('firebaseToken')).toBe(mockTokenWithRole);
      });
    });
  });
});