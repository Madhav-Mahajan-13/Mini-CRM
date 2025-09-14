"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CampaignHistoryPage() {
  const router = useRouter()

  // TODO: Fetch campaign data from API route /api/campaigns
  const campaignData = [
    {
      id: 1,
      name: "Black Friday Sale",
      date: "2024-01-15",
      audienceSize: 2847,
      sent: 2847,
      failed: 12,
    },
    {
      id: 2,
      name: "New Product Launch",
      date: "2024-01-10",
      audienceSize: 1523,
      sent: 1523,
      failed: 8,
    },
    {
      id: 3,
      name: "Customer Retention",
      date: "2024-01-05",
      audienceSize: 892,
      sent: 892,
      failed: 3,
    },
    {
      id: 4,
      name: "Welcome Series",
      date: "2024-01-01",
      audienceSize: 1247,
      sent: 1247,
      failed: 15,
    },
  ]

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Audience Size</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Failed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaignData.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-muted-foreground">{campaign.date}</div>
                      </div>
                    </TableCell>
                    <TableCell>{campaign.audienceSize.toLocaleString()}</TableCell>
                    <TableCell>{campaign.sent.toLocaleString()}</TableCell>
                    <TableCell className="text-destructive">{campaign.failed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
