import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, Typography, Button, Alert, CircularProgress } from "@mui/material";
import { Google as GoogleIcon } from "@mui/icons-material";

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'auth_failed':
          setError('Authentication failed. Please try again.');
          break;
        case 'token_generation_failed':
          setError('Failed to generate authentication token. Please try again.');
          break;
        default:
          setError('An error occurred during login. Please try again.');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      navigate('/');
    }
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError("");
      
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      window.location.href = `${backendUrl}/auth/google`;
      
    } catch (error) {
      console.error('Error initiating Google sign in:', error);
      setError('Failed to start authentication process. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <Card sx={{ width: '100%', maxWidth: '450px' }}>
        <CardHeader>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Mini CRM Platform
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Sign in to manage your campaigns and customers
          </Typography>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Button 
            onClick={handleGoogleSignIn} 
            variant="contained" 
            fullWidth 
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
          
          <Typography variant="caption" display="block" color="text.secondary" align="center" sx={{ mt: 2 }}>
            By signing in, you agree to our terms of service
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}