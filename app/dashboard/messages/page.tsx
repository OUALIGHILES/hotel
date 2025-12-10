"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, Search } from "lucide-react"
import { useState } from "react"

export default function MessagesPage() {
  const [selectedThread, setSelectedThread] = useState<number | null>(null)

  const threads = [
    { id: 1, guest: "John Doe", subject: "Check-in time questions", unread: 2, lastMessage: "Can I check in early?" },
    { id: 2, guest: "Jane Smith", subject: "Room issue", unread: 0, lastMessage: "The AC is broken" },
    { id: 3, guest: "Bob Johnson", subject: "Departure inquiry", unread: 1, lastMessage: "Can I leave luggage?" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Messages</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threads List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search..." className="w-full px-3 py-2 pl-10 border rounded-lg text-sm" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={`p-3 rounded-lg cursor-pointer border-l-4 transition-colors ${
                  selectedThread === thread.id
                    ? "bg-blue-50 border-blue-500"
                    : "bg-slate-50 border-transparent hover:bg-slate-100"
                }`}
              >
                <p className="font-semibold text-sm">{thread.guest}</p>
                <p className="text-xs text-muted-foreground truncate">{thread.lastMessage}</p>
                {thread.unread > 0 && (
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full mt-1 inline-block">
                    {thread.unread}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Message View */}
        <Card className="lg:col-span-2">
          {selectedThread ? (
            <>
              <CardHeader className="border-b">
                <CardTitle>John Doe</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4 h-96 overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                      <p className="text-sm">Hi, I have a question about check-in</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-slate-100 p-3 rounded-lg max-w-xs">
                      <p className="text-sm">Hello! How can I help?</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                      <p className="text-sm">Can I check in early?</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <Button size="sm" className="gap-2">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Select a conversation to view messages</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
