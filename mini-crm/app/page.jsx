"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Plus } from "lucide-react"

export default function CampaignHistoryPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const res = await fetch(`${backendUrl}/api/users/campaigns/`)
        if (!res.ok) throw new Error("Failed to fetch campaigns")
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      } catch (err) {
        console.error(err)
        setError("Failed to load campaigns")
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const handleCreateCampaign = () => {
    router.push("/create-campaign")
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
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Campaign History</CardTitle>
              <Button onClick={handleCreateCampaign} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Campaign
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && <p className="text-sm text-muted-foreground">Loading campaigns...</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {!loading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Audience Size</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No campaigns found
                      </TableCell>
                    </TableRow>
                  )}

                  {campaigns.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-sm text-muted-foreground">{c.date}</div>
                        </div>
                      </TableCell>
                      <TableCell>{c.audienceSize?.toLocaleString() ?? 0}</TableCell>
                      <TableCell>{c.sent?.toLocaleString() ?? 0}</TableCell>
                      <TableCell className="text-destructive">{c.failed ?? 0}</TableCell>
                      <TableCell className="text-amber-600">{c.pending ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
