"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, Search, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// Define TypeScript interfaces for our data
interface Message {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  body: string
  is_read: boolean
  created_at: string
  sender_name?: string
  recipient_name?: string
}

interface Thread {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  last_message: string
  last_message_time: string
  unread_count: number
  sender_name: string
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null) // Changed to null initially
  const [userProfile, setUserProfile] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  // Check authentication using the same method as other pages
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use the same auth check as other dashboard pages
        const response = await fetch("/api/auth/check");
        if (!response.ok) {
          setIsAuthenticated(false);
          router.push("/auth/login");
          return;
        }

        const result = await response.json();
        if (!result.user) {
          setIsAuthenticated(false);
          router.push("/auth/login");
          return;
        }

        // User is authenticated
        setIsAuthenticated(true);
        setCurrentUserId(result.user.id);
        setUserProfile(result.user);
      } catch (error) {
        console.error("Error checking auth:", error);
        setIsAuthenticated(false);
        router.push("/auth/login");
      }
    };

    checkAuth();
  }, [router]);

  // If authentication is still loading, show loader
  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Checking authentication...</span>
      </div>
    );
  }

  // If not authenticated, show loader before redirect
  if (isAuthenticated === false) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Redirecting to login...</span>
      </div>
    );
  }

  // Only render the main content for authenticated users
  return (
    <AuthenticatedMessagesPage
      currentUserId={currentUserId}
      userProfile={userProfile}
      router={router}
      supabase={supabase}
      threads={threads}
      setThreads={setThreads}
      messages={messages}
      setMessages={setMessages}
      selectedThread={selectedThread}
      setSelectedThread={setSelectedThread}
      messageInput={messageInput}
      setMessageInput={setMessageInput}
      isLoading={isLoading}
      setIsLoading={setIsLoading}
      isLoadingMessages={isLoadingMessages}
      setIsLoadingMessages={setIsLoadingMessages}
    />
  );
}

// Separate component for authenticated users
function AuthenticatedMessagesPage({
  currentUserId,
  userProfile,
  router,
  supabase,
  threads,
  setThreads,
  messages,
  setMessages,
  selectedThread,
  setSelectedThread,
  messageInput,
  setMessageInput,
  isLoading,
  setIsLoading,
  isLoadingMessages,
  setIsLoadingMessages
}: {
  currentUserId: string | null,
  userProfile: any,
  router: ReturnType<typeof useRouter>,
  supabase: ReturnType<typeof createClient>,
  threads: Thread[],
  setThreads: React.Dispatch<React.SetStateAction<Thread[]>>,
  messages: Message[],
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  selectedThread: string | null,
  setSelectedThread: React.Dispatch<React.SetStateAction<string | null>>,
  messageInput: string,
  setMessageInput: React.Dispatch<React.SetStateAction<string>>,
  isLoading: boolean,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  isLoadingMessages: boolean,
  setIsLoadingMessages: React.Dispatch<React.SetStateAction<boolean>>
}) {
  // Fetch user's threads
  useEffect(() => {
    if (!currentUserId) return; // Don't run if user isn't authenticated yet

    const fetchThreads = async () => {
      try {
        setIsLoading(true)

        // First, get all messages where the user is either sender or recipient
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select(`
            id,
            sender_id,
            recipient_id,
            subject,
            body,
            is_read,
            created_at
          `)
          .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
          .order("created_at", { ascending: false })

        if (messagesError) {
          console.error("Error fetching messages:", messagesError)
          setThreads([])
          return
        }

        // Get unique user IDs to fetch names
        const userIds = new Set<string>();
        messagesData.forEach(msg => {
          userIds.add(msg.sender_id);
          userIds.add(msg.recipient_id);
        });

        // Fetch user profiles to get names
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", Array.from(userIds));

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          // Continue with messages but without names
        }

        // Create a lookup map for user names
        const userNames: Record<string, string> = {};
        if (profilesData) {
          profilesData.forEach(profile => {
            userNames[profile.id] = profile.full_name || profile.id.substring(0, 8);
          });
        }

        // Process messages to create threads
        const threadMap: Record<string, Thread> = {}

        messagesData.forEach(msg => {
          // Determine the other participant in the conversation
          const otherUserId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
          const threadId = otherUserId; // Use the other user's ID as thread identifier

          // Get sender name: if current user is sender, show recipient's name, otherwise show sender's name
          let senderName = 'Other Participant';
          if (msg.sender_id === currentUserId && userNames[msg.recipient_id]) {
            senderName = userNames[msg.recipient_id];
          } else if (msg.recipient_id === currentUserId && userNames[msg.sender_id]) {
            senderName = userNames[msg.sender_id];
          }

          // If this thread doesn't exist yet, create it
          if (!threadMap[threadId]) {
            threadMap[threadId] = {
              id: threadId,
              sender_id: msg.sender_id,
              recipient_id: msg.recipient_id,
              subject: msg.subject || 'No Subject',
              last_message: msg.body,
              last_message_time: msg.created_at,
              unread_count: msg.is_read ? 0 : (msg.recipient_id === currentUserId ? 1 : 0),
              sender_name: senderName,
            }
          } else {
            // Update if this is a more recent message
            if (new Date(msg.created_at) > new Date(threadMap[threadId].last_message_time)) {
              threadMap[threadId].last_message = msg.body;
              threadMap[threadId].last_message_time = msg.created_at;
            }
            // Update unread count
            if (!msg.is_read && msg.recipient_id === currentUserId) {
              threadMap[threadId].unread_count += 1;
            }
          }
        })

        // Convert threadMap to array and sort by last message time
        const userThreads = Object.values(threadMap);
        userThreads.sort((a, b) =>
          new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
        );

        setThreads(userThreads);
      } catch (error) {
        console.error("Error in fetchThreads:", error)
        setThreads([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchThreads()
  }, [currentUserId]) // Only depend on currentUserId to avoid infinite loop

  // Fetch messages for a specific thread
  const fetchThreadMessages = async (threadId: string) => {
    if (!currentUserId) return;

    try {
      setIsLoadingMessages(true)

      // Get all messages between current user and the other participant
      const { data: threadMessages, error: messagesError } = await supabase
        .from("messages")
        .select(`
          id,
          sender_id,
          recipient_id,
          subject,
          body,
          is_read,
          created_at
        `)
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${threadId}),and(sender_id.eq.${threadId},recipient_id.eq.${currentUserId})`)
        .order("created_at", { ascending: true })

      if (messagesError) {
        console.error("Error fetching thread messages:", messagesError)
        return
      }

      // Get unique user IDs to fetch names
      const userIds = new Set<string>();
      threadMessages.forEach(msg => {
        userIds.add(msg.sender_id);
        userIds.add(msg.recipient_id);
      });

      // Fetch user profiles to get names
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(userIds));

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Continue with messages but without names
      }

      // Create a lookup map for user names
      const userNames: Record<string, string> = {};
      if (profilesData) {
        profilesData.forEach(profile => {
          userNames[profile.id] = profile.full_name || profile.id.substring(0, 8);
        });
      }

      const processedMessages: Message[] = threadMessages.map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        recipient_id: msg.recipient_id,
        subject: msg.subject,
        body: msg.body,
        is_read: msg.is_read,
        created_at: msg.created_at,
        sender_name: msg.sender_id === currentUserId
          ? 'You'
          : (userNames[msg.sender_id] || msg.sender_id.substring(0, 8) + '...') // Show actual name or truncated ID
      }))

      setMessages(processedMessages)

      // Mark messages as read
      const unreadMessageIds = threadMessages
        .filter((msg: any) => !msg.is_read && msg.recipient_id === currentUserId)
        .map((msg: any) => msg.id)

      if (unreadMessageIds.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", unreadMessageIds)
      }

    } catch (error) {
      console.error("Error in fetchThreadMessages:", error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Handle thread selection
  useEffect(() => {
    if (selectedThread && currentUserId) {
      fetchThreadMessages(selectedThread)
    }
  }, [selectedThread, currentUserId]) // Removed fetchThreadMessages to avoid dependency issues

  // Send a new message
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedThread || !currentUserId) return

    try {
      // Insert the new message
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedThread, // Use the threadId as recipient
          subject: `Message to ${selectedThread}`, // Use a simple subject
          body: messageInput,
          is_read: false
        })

      if (error) {
        console.error("Error sending message:", error)
        return
      }

      // Clear the input
      setMessageInput("")

      // Refetch the thread messages to include the new one
      setTimeout(() => {
        if (selectedThread) {
          fetchThreadMessages(selectedThread);
        }
      }, 300); // Small delay to allow DB to update

      // Refetch threads to update the thread list after a short delay
      setTimeout(() => {
        const fetchUpdatedThreads = async () => {
          if (!currentUserId) return;

          try {
            // Only fetch updated threads if currently loading threads is not in progress
            const { data: messagesData, error: messagesError } = await supabase
              .from("messages")
              .select(`
                id,
                sender_id,
                recipient_id,
                subject,
                body,
                is_read,
                created_at
              `)
              .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
              .order("created_at", { ascending: false })

            if (messagesError) {
              console.error("Error fetching messages:", messagesError)
              return
            }

            // Get unique user IDs to fetch names
            const userIds = new Set<string>();
            messagesData.forEach(msg => {
              userIds.add(msg.sender_id);
              userIds.add(msg.recipient_id);
            });

            // Fetch user profiles to get names
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", Array.from(userIds));

            if (profilesError) {
              console.error("Error fetching profiles:", profilesError);
              // Continue with messages but without names
            }

            // Create a lookup map for user names
            const userNames: Record<string, string> = {};
            if (profilesData) {
              profilesData.forEach(profile => {
                userNames[profile.id] = profile.full_name || profile.id.substring(0, 8);
              });
            }

            // Process messages to create threads
            const threadMap: Record<string, Thread> = {}

            messagesData.forEach(msg => {
              // Determine the other participant in the conversation
              const otherUserId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
              const threadId = otherUserId; // Use the other user's ID as thread identifier

              // Get sender name: if current user is sender, show recipient's name, otherwise show sender's name
              let senderName = 'Other Participant';
              if (msg.sender_id === currentUserId && userNames[msg.recipient_id]) {
                senderName = userNames[msg.recipient_id];
              } else if (msg.recipient_id === currentUserId && userNames[msg.sender_id]) {
                senderName = userNames[msg.sender_id];
              }

              // If this thread doesn't exist yet, create it
              if (!threadMap[threadId]) {
                threadMap[threadId] = {
                  id: threadId,
                  sender_id: msg.sender_id,
                  recipient_id: msg.recipient_id,
                  subject: msg.subject || 'No Subject',
                  last_message: msg.body,
                  last_message_time: msg.created_at,
                  unread_count: msg.is_read ? 0 : (msg.recipient_id === currentUserId ? 1 : 0),
                  sender_name: senderName,
                }
              } else {
                // Update if this is a more recent message
                if (new Date(msg.created_at) > new Date(threadMap[threadId].last_message_time)) {
                  threadMap[threadId].last_message = msg.body;
                  threadMap[threadId].last_message_time = msg.created_at;
                }
                // Update unread count
                if (!msg.is_read && msg.recipient_id === currentUserId) {
                  threadMap[threadId].unread_count += 1;
                }
              }
            })

            // Convert threadMap to array and sort by last message time
            const userThreads = Object.values(threadMap);
            userThreads.sort((a, b) =>
              new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
            );

            setThreads(userThreads);
          } catch (error) {
            console.error("Error in fetchUpdatedThreads:", error)
          }
        }

        fetchUpdatedThreads();
      }, 500);
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Messages</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading messages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Threads List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Conversations</CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="w-full px-3 py-2 pl-10 border rounded-lg text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
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
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm">{thread.sender_name}</p>
                    {thread.unread_count > 0 && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{thread.last_message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(thread.last_message_time).toLocaleDateString()}
                  </p>
                </div>
              ))}

              {threads.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No conversations yet</p>
              )}
            </CardContent>
          </Card>

          {/* Message View */}
          <Card className="lg:col-span-2">
            {selectedThread ? (
              <>
                <CardHeader className="border-b">
                  <CardTitle>
                    {threads.find(t => t.id === selectedThread)?.sender_name || 'Conversation'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 h-96 overflow-y-auto">
                  {isLoadingMessages ? (
                    <div className="flex justify-center items-center h-full">
                      <p>Loading messages...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.length > 0 ? (
                        messages.map((msg) => {
                          const isCurrentUser = currentUserId && msg.sender_id === currentUserId;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`p-3 rounded-lg max-w-xs ${
                                  isCurrentUser
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-100 text-gray-800'
                                }`}
                              >
                                <p className="text-sm">{msg.body}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-center text-muted-foreground">No messages in this conversation</p>
                      )}
                    </div>
                  )}
                </CardContent>
                <div className="p-4 border-t flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        sendMessage()
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={sendMessage}
                    disabled={!messageInput.trim()}
                  >
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
      )}
    </div>
  )
}