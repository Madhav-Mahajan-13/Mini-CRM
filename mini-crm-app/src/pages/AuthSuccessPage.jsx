import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, Typography, Alert, CircularProgress } from "@mui/material";
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from "@mui/icons-material";

export default function AuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const token = searchParams.get('token');
        const userParam = searchParams.get('user');

        if (!token || !userParam) {
          setStatus('error');
          setMessage('Missing authentication data. Please try logging in again.');
          return;
        }

        let userData;
        try {
          userData = JSON.parse(decodeURIComponent(userParam));
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          setStatus('error');
          setMessage('Invalid user data received. Please try logging in again.');
          return;
        }

        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${backendUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Token verification failed');
        }

        const verificationData = await response.json();
        
        if (!verificationData.success) {
          throw new Error('Authentication verification failed');
        }

        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));

        setStatus('success');
        setMessage(`Welcome back, ${userData.name}! Redirecting to dashboard...`);

        setTimeout(() => {
          navigate('/');
        }, 2000);

      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('Authentication failed. Please try logging in again.');
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <CircularProgress size={24} />;
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <CircularProgress size={24} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <Card sx={{ width: '100%', maxWidth: '450px' }}>
        <CardHeader>
          <Typography variant="h5" component="h1" align="center">
            Authentication
          </Typography>
        </CardHeader>
        <CardContent>
          <Alert severity={status === 'error' ? 'error' : 'info'} icon={getIcon()}>
            {message}
          </Alert>
          
          {status === 'processing' && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              This may take a few seconds...
            </Typography>
          )}
          
          {status === 'error' && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              Redirecting to login page...
            </Typography>
          )}
        </CardContent>
      </Card>
    </div>
  );
}