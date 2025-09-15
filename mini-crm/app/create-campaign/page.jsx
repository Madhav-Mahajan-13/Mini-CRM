"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Plus, Trash2, Info, AlertCircle } from "lucide-react"

// ✨ IMPROVEMENT: Import auth utilities including the new `authFetch` and `useAuth` hook
import { useAuth, authFetch } from "../utils/auth"

export default function CreateCampaignPage() {
  const router = useRouter()
  // ✨ IMPROVEMENT: Use the `useAuth` hook to manage user state and auth status
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const [campaignName, setCampaignName] = useState("")
  const [rules, setRules] = useState([{ field: "", operator: "", value: "", logic: "AND" }])
  const [message, setMessage] = useState("")
  const [audienceSize, setAudienceSize] = useState(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  // ✨ IMPROVEMENT: Protect the route. Redirect if not authenticated.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  const fieldOptions = ["Total Spend", "Total Visits", "Last Visit Date"]
  const operatorOptions = [">", "<", "="]
  const logicOptions = ["AND", "OR"]

  const addRule = () => {
    setRules([...rules, { field: "", operator: "", value: "", logic: "AND" }])
  }

  const removeRule = (index) => {
    if (rules.length > 1) {
      const newRules = rules.filter((_, i) => i !== index)
      setRules(newRules)
      setAudienceSize(null)
    }
  }

  const updateRule = (index, field, value) => {
    const newRules = rules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule))
    setRules(newRules)
    setAudienceSize(null)
  }

  // Preview audience size
  const previewAudience = async () => {
    const validRules = rules.filter(rule => rule.field && rule.operator && rule.value)
    if (validRules.length === 0) return

    setIsLoadingPreview(true)
    setAudienceSize(null)
    try {
      // ✨ IMPROVEMENT: Use the centralized `authFetch` utility
      const response = await authFetch('/api/users/audience-preview', {
        method: 'POST',
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
    if (!campaignName.trim()) newErrors.campaignName = "Campaign name is required"
    if (!message.trim()) newErrors.message = "Campaign message is required"

    const completeRules = rules.filter(rule => rule.field && rule.operator && rule.value)
    if (completeRules.length === 0) {
      newErrors.rules = "At least one complete rule is required"
    }

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
      const completeRules = rules.filter(rule => rule.field && rule.operator && rule.value)
      const campaignData = {
        name: campaignName.trim(),
        message_template: message.trim(),
        rules_json: completeRules.map((rule, index) => ({
          ...rule,
          logic: index < completeRules.length - 1 ? rule.logic : null,
        }))
      }

      // ✨ IMPROVEMENT: Use the centralized `authFetch` utility
      const response = await authFetch('/api/users/campaigns/create', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      })

      if (response.ok) {
        router.push("/")
      } else {
        const errorData = await response.json()
        setErrors({ submit: errorData.message || "Failed to create campaign" })
      }
    } catch (error) {
      console.error("Error creating campaign:", error)
      setErrors({ submit: error.message || "An unexpected error occurred" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show a loading state or nothing while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mini CRM</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar>
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-right">
                {/* ✨ IMPROVEMENT: Use `user` object from the `useAuth` hook */}
                <span className="text-sm font-medium">{user?.name || "User"}</span>
                <span className="text-xs text-muted-foreground">{user?.email || ""}</span>
              </div>
            </div>
            <Button variant="outline" onClick={logout}>Logout</Button>
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
            {/* Form elements remain largely the same */}
            {/* Campaign Name */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Campaign Name</h3>
              <Input
                placeholder="Enter campaign name..."
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className={errors.campaignName ? "border-red-500" : ""}
              />
              {errors.campaignName && <p className="text-sm text-red-500">{errors.campaignName}</p>}
            </div>

            {/* Step 1: Build Your Audience */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Step 1: Build Your Audience</h3>
                <Button onClick={previewAudience} variant="outline" size="sm" disabled={isLoadingPreview}>
                  {isLoadingPreview ? "Loading..." : "Preview Audience"}
                </Button>
              </div>
              {errors.rules && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.rules}</AlertDescription>
                </Alert>
              )}
              {rules.map((rule, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Select value={rule.field} onValueChange={(value) => updateRule(index, "field", value)}>
                      <SelectTrigger className={`w-48 ${errors[`rule_${index}_field`] ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={rule.operator} onValueChange={(value) => updateRule(index, "operator", value)}>
                      <SelectTrigger className={`w-20 ${errors[`rule_${index}_operator`] ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Op" />
                      </SelectTrigger>
                      <SelectContent>
                        {operatorOptions.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={rule.value}
                      onChange={(e) => updateRule(index, "value", e.target.value)}
                      className={`w-32 ${errors[`rule_${index}_value`] ? "border-red-500" : ""}`}
                    />
                    <Button variant="outline" size="icon" onClick={() => removeRule(index)} disabled={rules.length === 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {index < rules.length - 1 && (
                    <div className="flex justify-center">
                      <Select value={rule.logic} onValueChange={(value) => updateRule(index, "logic", value)}>
                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {logicOptions.map((option) => (<SelectItem key={option} value={option}>{option}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={addRule} variant="outline" className="flex items-center gap-2 bg-transparent">
                <Plus className="h-4 w-4" /> Add Rule
              </Button>
            </div>
            
            {/* Audience Size Preview */}
            {audienceSize !== null && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  Audience Size Preview: {audienceSize.toLocaleString()} customers match this criteria.
                </AlertDescription>
              </Alert>
            )}

            {/* Compose Your Message */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Step 3: Compose Your Message</h3>
              <Textarea
                placeholder="Write your campaign message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className={`w-full ${errors.message ? "border-red-500" : ""}`}
              />
              {errors.message && <p className="text-sm text-red-500">{errors.message}</p>}
            </div>

            {/* Error Alert */}
            {errors.submit && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}
            
            {/* Final Action */}
            <div className="flex justify-end">
              <Button onClick={handleSaveAndLaunch} size="lg" className="px-8" disabled={isSubmitting}>
                {isSubmitting ? "Creating Campaign..." : "Save and Launch Campaign"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}