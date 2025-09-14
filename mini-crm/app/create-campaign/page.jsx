"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Plus, Trash2, Info, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CreateCampaignPage() {
  const router = useRouter()
  const [campaignName, setCampaignName] = useState("")
  const [rules, setRules] = useState([{ field: "", operator: "", value: "", logic: "AND" }])
  const [message, setMessage] = useState("")
  const [audienceSize, setAudienceSize] = useState(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const fieldOptions = ["Total Spend", "Total Visits", "Last Visit Date"]
  const operatorOptions = [">", "<", "="]
  const logicOptions = ["AND", "OR"]

  const addRule = () => {
    const newRule = {
      field: "",
      operator: "",
      value: "",
      logic: "AND",
    }
    setRules([...rules, newRule])
  }

  const removeRule = (index) => {
    if (rules.length > 1) {
      const newRules = rules.filter((_, i) => i !== index)
      setRules(newRules)
      // Clear audience preview when rules change
      setAudienceSize(null)
    }
  }

  const updateRule = (index, field, value) => {
    const newRules = rules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule))
    setRules(newRules)
    // Clear audience preview when rules change
    setAudienceSize(null)
  }

  // Preview audience size
  const previewAudience = async () => {
    // Validate rules before preview
    const validRules = rules.filter(rule => rule.field && rule.operator && rule.value)
    if (validRules.length === 0) return

    console.log("Previewing audience with rules:", validRules)
    setIsLoadingPreview(true)
    try {
      const response = await fetch('http://localhost:5000/api/users/audience-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules: validRules }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setAudienceSize(data.count)
      } else {
        console.error('Failed to fetch audience preview')
      }
    } catch (error) {
      console.error('Error fetching audience preview:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!campaignName.trim()) {
      newErrors.campaignName = "Campaign name is required"
    }

    if (!message.trim()) {
      newErrors.message = "Campaign message is required"
    }

    // Check if at least one complete rule exists
    const completeRules = rules.filter(rule => rule.field && rule.operator && rule.value)
    if (completeRules.length === 0) {
      newErrors.rules = "At least one complete rule is required"
    }

    // Validate each rule
    rules.forEach((rule, index) => {
      if (rule.field || rule.operator || rule.value) {
        if (!rule.field) newErrors[`rule_${index}_field`] = "Field is required"
        if (!rule.operator) newErrors[`rule_${index}_operator`] = "Operator is required"
        if (!rule.value) newErrors[`rule_${index}_value`] = "Value is required"
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveAndLaunch = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    
    try {
      // Filter out incomplete rules
      const completeRules = rules.filter(rule => rule.field && rule.operator && rule.value)
      
      // Prepare campaign data for API
      const campaignData = {
        name: campaignName.trim(),
        message_template: message.trim(),
        rules_json: completeRules.map((rule, index) => ({
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
          logic: index < completeRules.length - 1 ? rule.logic : null // Don't include logic for last rule
        }))
      }

      console.log("Submitting campaign data:", campaignData)

      const response = await fetch('http://localhost:5000/api/users/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log("Campaign created successfully:", result)
        
        // --- INTENTIONAL DELAY ADDED HERE ---
        // Wait for 2 seconds to give user feedback before redirecting
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        
        router.push("/")
      } else {
        const errorData = await response.json()
        console.error("Failed to create campaign:", errorData)
        setErrors({ submit: errorData.message || "Failed to create campaign" })
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      setErrors({ submit: "An unexpected error occurred" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mini CRM</h1>
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">Demo User</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Campaign Name */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Campaign Name</h3>
              <Input
                placeholder="Enter campaign name..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className={errors.campaignName ? "border-red-500" : ""}
              />
              {errors.campaignName && (
                <p className="text-sm text-red-500">{errors.campaignName}</p>
              )}
            </div>

            {/* Step 1: Build Your Audience */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Step 1: Build Your Audience</h3>
                <Button 
                  onClick={previewAudience} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoadingPreview}
                >
                  {isLoadingPreview ? "Loading..." : "Preview Audience"}
                </Button>
              </div>

              {errors.rules && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-700 dark:text-red-300">
                    {errors.rules}
                  </AlertDescription>
                </Alert>
              )}

              {rules.map((rule, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select 
                      value={rule.field} 
                      onValueChange={(value) => updateRule(index, "field", value)}
                    >
                      <SelectTrigger className={`w-48 ${errors[`rule_${index}_field`] ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={rule.operator} 
                      onValueChange={(value) => updateRule(index, "operator", value)}
                    >
                      <SelectTrigger className={`w-20 ${errors[`rule_${index}_operator`] ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Op" />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      placeholder="Value"
                      value={rule.value}
                      onChange={(e) => updateRule(index, "value", e.target.value)}
                      className={`w-32 ${errors[`rule_${index}_value`] ? "border-red-500" : ""}`}
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeRule(index)}
                      disabled={rules.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Logic selector between rules (not shown for last rule) */}
                  {index < rules.length - 1 && (
                    <div className="flex justify-center">
                      <Select 
                        value={rule.logic} 
                        onValueChange={(value) => updateRule(index, "logic", value)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue placeholder="Logic" />
                        </SelectTrigger>
                        <SelectContent>
                          {logicOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}

              <Button onClick={addRule} variant="outline" className="flex items-center gap-2 bg-transparent">
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>

            {/* Step 2: Audience Size Preview */}
            {audienceSize !== null && (
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Info className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  Audience Size Preview: {audienceSize.toLocaleString()} customers match this criteria.
                </AlertDescription>
              </Alert>
            )}

            {/* Step 3: Compose Your Message */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 3: Compose Your Message</h3>
              <Textarea
                placeholder="Write your campaign message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className={`w-full ${errors.message ? "border-red-500" : ""}`}
              />
              {errors.message && (
                <p className="text-sm text-red-500">{errors.message}</p>
              )}
            </div>

            {/* Error Alert */}
            {errors.submit && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700 dark:text-red-300">
                  {errors.submit}
                </AlertDescription>
              </Alert>
            )}

            {/* Final Action */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveAndLaunch} 
                size="lg" 
                className="px-8"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Campaign..." : "Save and Launch Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
