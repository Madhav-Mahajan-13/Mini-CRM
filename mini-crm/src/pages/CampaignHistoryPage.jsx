import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, Typography, Button, Container, Card, CardContent, CardHeader,
  Table, TableBody, TableCell, TableHead, TableRow, Avatar, Box, CircularProgress, Alert
} from "@mui/material";
import { Add as AddIcon, Person as PersonIcon } from "@mui/icons-material";
import { useAuth, authFetch } from "../utils/auth";

export default function CampaignHistoryPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    if (isAuthenticated) {
      const fetchCampaigns = async () => {
        try {
          const res = await authFetch("/api/users/campaigns/");
          
          if (!res.ok) {
            throw new Error("Failed to fetch campaigns");
          }
          
          const data = await res.json();
          setCampaigns(data.campaigns || []);
        } catch (err) {
          console.error(err);
          setError(err.message || "Failed to load campaigns");
        } finally {
          setLoading(false);
        }
      };

      fetchCampaigns();
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  const handleCreateCampaign = () => {
    navigate("/create-campaign");
  };

  if (isAuthLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Mini CRM
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar>
              <PersonIcon />
            </Avatar>
            <div>
              <Typography variant="body1">{user?.name || "User"}</Typography>
              <Typography variant="caption">{user?.email || ""}</Typography>
            </div>
            <Button color="inherit" onClick={logout}>Logout</Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Card>
          <CardHeader
            title="Campaign History"
            action={
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateCampaign}
              >
                Create New Campaign
              </Button>
            }
          />
          <CardContent>
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Campaign</TableCell>
                    <TableCell>Audience Size</TableCell>
                    <TableCell>Sent</TableCell>
                    <TableCell>Failed</TableCell>
                    <TableCell>Pending</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No campaigns found
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Typography variant="body1">{c.name}</Typography>
                          {c.date && <Typography variant="caption">{new Date(c.date).toLocaleDateString()}</Typography>}
                        </TableCell>
                        <TableCell>{c.audienceSize?.toLocaleString() ?? 0}</TableCell>
                        <TableCell>{c.sent?.toLocaleString() ?? 0}</TableCell>
                        <TableCell sx={{ color: 'error.main' }}>{c.failed ?? 0}</TableCell>
                        <TableCell sx={{ color: 'warning.main' }}>{c.pending ?? 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}