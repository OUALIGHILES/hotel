"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Check,
  CalendarIcon,
  Printer,
  Download,
  FileText
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  title: string
  description: string
  priority: string
  status: string
  due_date: string
  property_id: string
  unit_id: string
  property_name?: string
  unit_name?: string
}

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    due_date: "",
    property_id: "",
    unit_id: ""
  })
  const [filter, setFilter] = useState<string>("all") // all, pending, in_progress, completed
  const [sort, setSort] = useState<string>("due_date") // due_date, priority, status
  const [properties, setProperties] = useState<Property[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    if (newTask.property_id) {
      fetchUnitsForProperty(newTask.property_id)
    }
  }, [newTask.property_id])

  const fetchProperties = async () => {
    try {
      // Check if user is authenticated using the same method as other pages
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();
      if (!result.user) {
        setIsAuthenticated(false);
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        setIsAuthenticated(false);
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("user_id", userId)
        .order("name")

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error("Error fetching properties:", error)
      setIsAuthenticated(false);
    }
  }

  const fetchUnitsForProperty = async (propertyId: string) => {
    try {
      // Check if user is authenticated using the same method as other pages
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();
      if (!result.user) {
        setIsAuthenticated(false);
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        setIsAuthenticated(false);
        return;
      }

      // Verify that the property belongs to the user
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .eq("user_id", userId)
        .single();

      if (propertyError || !propertyData) {
        console.error("Error verifying property ownership:", propertyError);
        setUnits([]);
        return;
      }

      const { data, error } = await supabase
        .from("units")
        .select("id, name")
        .eq("property_id", propertyId)
        .order("name")

      if (error) throw error
      setUnits(data || [])
    } catch (error) {
      console.error("Error fetching units:", error)
      setUnits([])
    }
  }

  const fetchTasks = async () => {
    try {
      // Check if user is authenticated using the same method as other pages
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        console.error("User not authenticated via API check");
        setIsAuthenticated(false);
        return;
      }

      const result = await response.json();
      if (!result.user) {
        console.error("No user found in auth check");
        setIsAuthenticated(false);
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        console.error("User ID not found in API response");
        setIsAuthenticated(false);
        return;
      }

      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      if (!propertiesData || propertiesData.length === 0) {
        setTasks([]);
        return;
      }

      const propertyIds = propertiesData.map(prop => prop.id);

      // Get tasks with property and unit names using joins
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          priority,
          status,
          due_date,
          property_id,
          unit_id,
          properties (name),
          units (name)
        `)
        .in("property_id", propertyIds)
        .order("due_date", { ascending: true })

      if (error) throw error

      // Transform the data to match our interface
      const transformedTasks = (data || []).map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date,
        property_id: task.property_id,
        unit_id: task.unit_id,
        property_name: task.properties?.name,
        unit_name: task.units?.name
      }));

      setTasks(transformedTasks)
    } catch (error) {
      console.error("Error fetching tasks:", error)
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.property_id) {
      alert("Please fill in at least the title and property");
      return;
    }

    try {
      // Check if user is authenticated using the same method as other pages
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      const result = await response.json();
      if (!result.user) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      // Verify that the selected property belongs to the user
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id")
        .eq("id", newTask.property_id)
        .eq("user_id", userId)
        .single();

      if (propertyError || !propertyData) {
        console.error("Error verifying property ownership:", propertyError);
        alert("Invalid property selection. Please try again.");
        return;
      }

      // Create task object with proper data formatting
      const taskToInsert: any = {
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        status: 'pending',  // Default status for new tasks
        property_id: newTask.property_id,
        due_date: newTask.due_date || null,
      };

      // Add unit_id if provided
      if (newTask.unit_id) {
        taskToInsert.unit_id = newTask.unit_id;
      }

      // Add assigned_to if provided
      if (userId) {
        taskToInsert.assigned_to = userId;
      }

      const { error } = await supabase
        .from("tasks")
        .insert([taskToInsert])

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      // Reset form and close modal
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        due_date: "",
        property_id: "",
        unit_id: ""
      })
      setIsModalOpen(false)

      // Refetch tasks
      fetchTasks()
    } catch (error) {
      console.error("Error creating task:", error)
      alert("Error creating task. Please try again.")
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      // Check if user is authenticated using the same method as other pages
      const response = await fetch("/api/auth/check");
      if (!response.ok) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      const result = await response.json();
      if (!result.user) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      const userId = result.user.id;
      if (!userId) {
        setIsAuthenticated(false);
        alert("Authentication error. Please log in again.");
        return;
      }

      // Get user's properties to ensure they can only update tasks related to their properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select("id")
        .eq("user_id", userId);

      if (propertiesError) {
        console.error("Error fetching properties:", propertiesError);
        return;
      }

      if (!propertiesData) {
        return;
      }

      const propertyIds = propertiesData.map(prop => prop.id);

      // Only update the task if it belongs to the user's properties
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId)
        .in("property_id", propertyIds);

      if (error) {
        console.error("Error updating task status:", error);
        throw error;
      }

      // Update the task status in the state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      )
    } catch (error) {
      console.error("Error updating task status:", error)
      alert("Error updating task status. Please try again.")
    }
  }

  // Filter and sort tasks based on current filter and sort settings
  const getFilteredAndSortedTasks = () => {
    let filtered = tasks;

    // Apply filter
    if (filter !== "all") {
      filtered = filtered.filter(task => task.status === filter);
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      if (sort === "due_date") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else if (sort === "priority") {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
      } else if (sort === "status") {
        const statusOrder = { completed: 0, in_progress: 1, pending: 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      }
      return 0;
    });
  };

  // Ref for the print content
  const componentRef = useRef<HTMLDivElement>(null);

  // Function to handle printing tasks
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Add CSS for print styling
    const printCSS = `
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background: white;
        }
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .print-title {
          font-size: 24px;
          margin: 0;
          color: #2563eb;
        }
        .print-subtitle {
          font-size: 16px;
          color: #666;
          margin-top: 5px;
        }
        .print-date {
          text-align: right;
          font-size: 14px;
          color: #888;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-pending { background-color: #fef3c7; color: #d97706; }
        .status-in_progress { background-color: #dbeafe; color: #2563eb; }
        .status-completed { background-color: #d1fae5; color: #059669; }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #888;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
      </style>
    `;

    // Generate the print content
    const filteredTasks = getFilteredAndSortedTasks();

    let tasksHTML = `
      <div class="print-header">
        <h1 class="print-title">Tasks Report</h1>
        <div class="print-subtitle">Property Management System</div>
      </div>
      <div class="print-date">Generated on: ${new Date().toLocaleString()}</div>
    `;

    if (filteredTasks.length === 0) {
      tasksHTML += `<p>No tasks to display.</p>`;
    } else {
      tasksHTML += `
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Property</th>
              <th>Unit</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
      `;

      filteredTasks.forEach(task => {
        tasksHTML += `
          <tr>
            <td><strong>${task.title}</strong></td>
            <td>${task.description || '-'}</td>
            <td>${task.property_name || 'N/A'}</td>
            <td>${task.unit_name || 'N/A'}</td>
            <td>
              <span class="status-badge status-${task.priority}">
                ${task.priority}
              </span>
            </td>
            <td>
              <span class="status-badge status-${task.status}">
                ${task.status.replace('_', ' ')}
              </span>
            </td>
            <td>${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</td>
          </tr>
        `;
      });

      tasksHTML += `
          </tbody>
        </table>
      `;
    }

    tasksHTML += `
      <div class="footer">
        Generated by Wellhost PMS | Page 1
      </div>
    `;

    // Write the content to the print window
    printWindow.document.write(`
      <html>
        <head>
          <title>Tasks Report - Wellhost PMS</title>
          ${printCSS}
        </head>
        <body>
          ${tasksHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Render task cards function
  const renderTaskCards = () => {
    return (
      <div className="space-y-3">
        {getFilteredAndSortedTasks().map((task) => (
          <Card key={task.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6 flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="mt-1">
                  {task.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {task.status === "in_progress" && <Clock className="w-5 h-5 text-blue-500" />}
                  {task.status === "pending" && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{task.title}</h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    {task.property_name && (
                      <p>Property: {task.property_name}</p>
                    )}
                    {task.unit_name && (
                      <p>Unit: {task.unit_name}</p>
                    )}
                    <p>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityClass(task.priority)}`}
                  >
                    {task.priority}
                  </span>
                  <div className="mt-2 flex gap-1">
                    <Button
                      variant={task.status === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, "pending")}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={task.status === "in_progress" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, "in_progress")}
                    >
                      In Progress
                    </Button>
                    <Button
                      variant={task.status === "completed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateTaskStatus(task.id, "completed")}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render main content based on loading and data state
  const renderMainContent = () => {
    if (isLoading) {
      return <p>Loading tasks...</p>;
    }

    const tasks = getFilteredAndSortedTasks();
    if (tasks.length === 0) {
      return (
        <Card className="text-center py-12">
          <p className="text-muted-foreground">
            {filter === "all" ? "No tasks yet" : `No ${filter} tasks`}
          </p>
        </Card>
      );
    }

    return renderTaskCards();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Print Tasks
          </Button>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    placeholder="Task description"
                  />
                </div>
                <div>
                  <Label htmlFor="property">Property</Label>
                  <Select value={newTask.property_id} onValueChange={(value) => setNewTask({...newTask, property_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map(property => (
                        <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unit">Unit (Optional)</Label>
                  <Select value={newTask.unit_id} onValueChange={(value) => setNewTask({...newTask, unit_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map(unit => (
                        <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newTask.priority} onValueChange={(value) => setNewTask({...newTask, priority: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newTask.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTask.due_date ? format(new Date(newTask.due_date), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newTask.due_date ? new Date(newTask.due_date) : undefined}
                        onSelect={(date) => setNewTask({...newTask, due_date: date ? date.toISOString().split('T')[0] : ""})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Tasks
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={filter === "in_progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("in_progress")}
          >
            In Progress
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Completed
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Sort by Due Date</SelectItem>
              <SelectItem value="priority">Sort by Priority</SelectItem>
              <SelectItem value="status">Sort by Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {renderMainContent()}
    </div>
  )
}
