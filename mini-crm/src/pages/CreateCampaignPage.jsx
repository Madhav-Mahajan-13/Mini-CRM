import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar, Toolbar, Typography, Button, Container, Card, CardContent, CardHeader,
  TextField, Select, MenuItem, FormControl, InputLabel, Box, CircularProgress,
  IconButton, Alert, Avatar
} from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon, Person as PersonIcon, Info as InfoIcon,
  AutoFixHigh as AutoFixHighIcon
} from "@mui/icons-material";
import { useAuth, authFetch } from "../utils/auth";

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [campaignName, setCampaignName] = useState("");
  const [rules, setRules] = useState([{ field: "", operator: "", value: "", logic: "AND" }]);
  const [message, setMessage] = useState("");
  const [audienceSize, setAudienceSize] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // State for the natural language prompt feature
  const [prompt, setPrompt] = useState("");
  const [isGeneratingRules, setIsGeneratingRules] = useState(false);
  const [generationError, setGenerationError] = useState("");


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const fieldOptions = ["Total Spend", "Total Visits", "Last Visit Date"];
  const operatorOptions = [">", "<", "="];
  const logicOptions = ["AND", "OR"];

  const addRule = () => {
    setRules([...rules, { field: "", operator: "", value: "", logic: "AND" }]);
  };

  const removeRule = (index) => {
    if (rules.length > 1) {
      const newRules = rules.filter((_, i) => i !== index);
      setRules(newRules);
      setAudienceSize(null);
    }
  };

  const updateRule = (index, field, value) => {
    const newRules = rules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule));
    setRules(newRules);
    setAudienceSize(null);
  };

  const previewAudience = async () => {
    const validRules = rules.filter(rule => rule.field && rule.operator && rule.value);
    if (validRules.length === 0) return;

    setIsLoadingPreview(true);
    setAudienceSize(null);
    try {
      const response = await authFetch('/api/users/audience-preview', {
        method: 'POST',
        body: JSON.stringify({ rules: validRules }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAudienceSize(data.count);
      } else {
        console.error('Failed to fetch audience preview');
      }
    } catch (error) {
      console.error('Error fetching audience preview:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!campaignName.trim()) newErrors.campaignName = "Campaign name is required";
    if (!message.trim()) newErrors.message = "Campaign message is required";

    const completeRules = rules.filter(rule => rule.field && rule.operator && rule.value);
    if (completeRules.length === 0) {
      newErrors.rules = "At least one complete rule is required";
    }

    rules.forEach((rule, index) => {
      if (rule.field || rule.operator || rule.value) {
        if (!rule.field) newErrors[`rule_${index}_field`] = "Field is required";
        if (!rule.operator) newErrors[`rule_${index}_operator`] = "Operator is required";
        if (!rule.value) newErrors[`rule_${index}_value`] = "Value is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAndLaunch = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const completeRules = rules.filter(rule => rule.field && rule.operator && rule.value);
      const campaignData = {
        name: campaignName.trim(),
        message_template: message.trim(),
        rules_json: completeRules.map((rule, index) => ({
          ...rule,
          logic: index < completeRules.length - 1 ? rule.logic : null,
        }))
      };

      const response = await authFetch('/api/users/campaigns/create', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        navigate("/");
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.message || "Failed to create campaign" });
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      setErrors({ submit: error.message || "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handles both rule generation from prompt and audience preview in one API call
   const handleGenerateAndPreview = async () => {
    if (!prompt.trim()) return;

    setIsGeneratingRules(true);
    setGenerationError("");
    setAudienceSize(null); // Clear previous preview
    try {
      // This endpoint returns both the parsed rules and the audience count
      const response = await authFetch('/api/users/preview-from-prompt', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const data = await response.json(); // Expects { rules: [...], count: 123 }
        if (Array.isArray(data.rules) && data.rules.length > 0) {
            setRules(data.rules);
            setAudienceSize(data.count);
            
            // Show info if fallback was used
            if (data.fallbackUsed) {
              setGenerationError("AI service is temporarily busy. Used pattern matching instead - please verify the generated rules.");
            }
        } else {
            setGenerationError("Could not generate valid rules from the prompt. Please try rephrasing.");
        }
      } else {
        const errorData = await response.json();
        if (errorData.fallbackUsed) {
          setGenerationError("AI service is temporarily unavailable. Please try again later or use the manual rule builder below.");
        } else {
          setGenerationError(errorData.message || "Failed to parse prompt.");
        }
      }
    } catch (error) {
      console.error('Error generating rules:', error);
      setGenerationError("Service temporarily unavailable. Please try again in a few moments or use the manual rule builder.");
    } finally {
      setIsGeneratingRules(false);
    }
  };

  if (isLoading || !isAuthenticated) {
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
          <CardHeader title="Create New Campaign" />
          <CardContent>
            <Box component="form" noValidate autoComplete="off" sx={{ '& .MuiTextField-root': { my: 1 }, '& .MuiFormControl-root': { my: 1 } }}>
              <Typography variant="h6" gutterBottom>Campaign Name</Typography>
              <TextField
                fullWidth
                label="Campaign Name"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                error={!!errors.campaignName}
                helperText={errors.campaignName}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 2 }}>
                <Typography variant="h6">Step 1: Build Your Audience</Typography>
                <Button onClick={previewAudience} variant="outlined" disabled={isLoadingPreview}>
                  {isLoadingPreview ? <CircularProgress size={24} /> : "Preview Audience"}
                </Button>
              </Box>
              
              {/* Natural Language Input Section */}
              <Box sx={{ border: '1px solid #e0e0e0', borderRadius: '4px', p: 2, my: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Describe Audience for a Quick Preview
                </Typography>
                <TextField
                  fullWidth
                  label="e.g., Customers who spent over ₹5000 and haven't visited in 3 months"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGeneratingRules}
                />
                <Button
                  onClick={handleGenerateAndPreview}
                  variant="contained"
                  startIcon={isGeneratingRules ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
                  disabled={isGeneratingRules || !prompt}
                  sx={{ mt: 1 }}
                >
                  Generate Rules & Preview Audience
                </Button>
                {generationError && <Alert severity="error" sx={{ mt: 2 }}>{generationError}</Alert>}
              </Box>

              {errors.rules && <Alert severity="error">{errors.rules}</Alert>}

              {rules.map((rule, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <FormControl fullWidth error={!!errors[`rule_${index}_field`]}>
                    <InputLabel>Field</InputLabel>
                    <Select
                      value={rule.field}
                      label="Field"
                      onChange={(e) => updateRule(index, "field", e.target.value)}
                    >
                      {fieldOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 120 }} error={!!errors[`rule_${index}_operator`]}>
                    <InputLabel>Operator</InputLabel>
                    <Select
                      value={rule.operator}
                      label="Operator"
                      onChange={(e) => updateRule(index, "operator", e.target.value)}
                    >
                      {operatorOptions.map((option) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Value"
                    value={rule.value}
                    onChange={(e) => updateRule(index, "value", e.target.value)}
                    error={!!errors[`rule_${index}_value`]}
                    helperText={errors[`rule_${index}_value`]}
                  />
                  <IconButton onClick={() => removeRule(index)} disabled={rules.length === 1}>
                    <DeleteIcon />
                  </IconButton>
                  {index < rules.length - 1 && (
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>Logic</InputLabel>
                      <Select
                        value={rule.logic}
                        label="Logic"
                        onChange={(e) => updateRule(index, "logic", e.target.value)}
                      >
                        {logicOptions.map((option) => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              ))}
              <Button onClick={addRule} startIcon={<AddIcon />}>Add Rule</Button>

              {audienceSize !== null && (
                <Alert icon={<InfoIcon />} severity="info" sx={{ my: 2 }}>
                  Audience Size Preview: {audienceSize.toLocaleString()} customers match this criteria.
                </Alert>
              )}

              <Typography variant="h6" sx={{ mt: 4 }} gutterBottom>Step 2: Compose Your Message</Typography>
              <TextField
                fullWidth
                label="Campaign Message"
                multiline
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                error={!!errors.message}
                helperText={errors.message}
              />

              {errors.submit && <Alert severity="error" sx={{ my: 2 }}>{errors.submit}</Alert>}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button onClick={handleSaveAndLaunch} variant="contained" size="large" disabled={isSubmitting}>
                  {isSubmitting ? <CircularProgress size={24} /> : "Save and Launch Campaign"}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}