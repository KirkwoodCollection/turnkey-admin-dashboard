import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component to handle seamless redirect to Grafana analytics dashboard.
 * Obtains Firebase token and redirects to Grafana via API Gateway.
 */
export const GrafanaRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { user, getIdToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const redirectToGrafana = async () => {
      try {
        // Check if user is authenticated
        if (!user) {
          setError('You must be logged in to access analytics');
          setIsRedirecting(false);
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Get fresh Firebase ID token
        const token = await getIdToken();

        // Store token in session storage for API Gateway
        // Note: In production, the token should be sent via Authorization header
        sessionStorage.setItem('firebaseToken', token);

        // Build Grafana URL with dashboard UID
        const grafanaPath = '/analytics/grafana/d/turnkey-main';

        // For development, you might want to use a different URL
        const baseUrl = process.env.NODE_ENV === 'development'
          ? process.env.VITE_GRAFANA_DEV_URL || ''
          : '';

        // Redirect to Grafana (same origin via API Gateway)
        // This triggers a full page load, exiting the React SPA
        window.location.href = baseUrl + grafanaPath;

      } catch (err) {
        console.error('Failed to redirect to Grafana:', err);
        setError('Failed to load analytics dashboard. Please try again.');
        setIsRedirecting(false);

        // Redirect back to main dashboard after error
        setTimeout(() => navigate('/dashboard'), 3000);
      }
    };

    redirectToGrafana();
  }, [user, getIdToken, navigate]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <>
          <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Loading Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isRedirecting ? 'Redirecting to Grafana...' : 'Please wait...'}
          </Typography>
        </>
      )}
    </Box>
  );
};