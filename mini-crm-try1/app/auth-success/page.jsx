"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function AuthSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('processing') // processing, success, error
  const [message, setMessage] = useState('Processing authentication...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get token and user data from URL parameters
        const token = searchParams.get('token')
        const userParam = searchParams.get('user')

        if (!token || !userParam) {
          setStatus('error')
          setMessage('Missing authentication data. Please try logging in again.')
          return
        }

        // Parse user data
        let userData
        try {
          userData = JSON.parse(decodeURIComponent(userParam))
        } catch (parseError) {
          console.error('Error parsing user data:', parseError)
          setStatus('error')
          setMessage('Invalid user data received. Please try logging in again.')
          return
        }

        // Verify token by making a test API call
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'
        const response = await fetch(`${backendUrl}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Token verification failed')
        }

        const verificationData = await response.json()
        
        if (!verificationData.success) {
          throw new Error('Authentication verification failed')
        }

        // Store authentication data in localStorage
        localStorage.setItem('authToken', token)
        localStorage.setItem('userData', JSON.stringify(userData))

        setStatus('success')
        setMessage(`Welcome back, ${userData.name}! Redirecting to dashboard...`)

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/')
        }, 2000)

      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('Authentication failed. Please try logging in again.')
        
        // Clean up any stored data
        localStorage.removeItem('authToken')
        localStorage.removeItem('userData')
        
        // Redirect to login after delay
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  const getIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />
      default:
        return <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    }
  }

  const getAlertVariant = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
    }
  }

  const getTextColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-700 dark:text-green-300'
      case 'error':
        return 'text-red-700 dark:text-red-300'
      default:
        return 'text-blue-700 dark:text-blue-300'
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className={getAlertVariant()}>
            <div className="flex items-center gap-3">
              {getIcon()}
              <AlertDescription className={getTextColor()}>
                {message}
              </AlertDescription>
            </div>
          </Alert>
          
          {status === 'processing' && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>This may take a few seconds...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <p>Redirecting to login page...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}