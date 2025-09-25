import React from 'react';
import { Box, Button, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { Google } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, loginWithGoogle } = useAuth();
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);

    try {
      await loginWithGoogle();
    } catch (error) {
      setLoginError('Google authentication failed. Please try again.');
      console.error('Google login error:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          bgcolor: 'grey.50'
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" gutterBottom>
                TurnkeyHMS
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Admin Dashboard
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              {loginError && (
                <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                  {loginError}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleGoogleLogin}
                disabled={loginLoading}
                startIcon={loginLoading ? <CircularProgress size={20} /> : <Google />}
                sx={{
                  mb: 2,
                  backgroundColor: '#4285f4',
                  '&:hover': {
                    backgroundColor: '#357ae8',
                  }
                }}
              >
                {loginLoading ? 'Signing in...' : 'Sign in with Google'}
              </Button>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
              Use your Google account to access the admin dashboard
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return <>{children}</>;
};