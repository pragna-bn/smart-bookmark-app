"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import toast, { Toaster } from "react-hot-toast"

type Bookmark = {
  id: string
  title: string
  url: string
  created_at?: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const [forceRefreshKey, setForceRefreshKey] = useState(0) // used only if real-time feels stuck

  // ─── CHECK USER & INITIAL FETCH ────────────────────────────────────────
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser(user)
      await fetchBookmarks(user.id)
      setLoading(false)
    }

    checkUser()
  }, [])

  // ─── REAL-TIME SUBSCRIPTION ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return

    console.log("Setting up real-time subscription for user:", user.id)

    const channelName = `bookmarks-user-${user.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Real-time event received:", payload.eventType, payload)

          if (payload.eventType === "INSERT") {
            setBookmarks((current) => {
              // Prevent duplicate if optimistic update already added it
              if (current.some(b => b.id === payload.new.id)) return current
              return [payload.new as Bookmark, ...current]
            })
            toast.success("New bookmark added!")
          } 
          else if (payload.eventType === "DELETE") {
            setBookmarks((current) =>
              current.filter((b) => b.id !== payload.old.id)
            )
            toast.success("Bookmark deleted!")
          } 
          else if (payload.eventType === "UPDATE") {
            setBookmarks((current) =>
              current.map((b) =>
                b.id === payload.new.id ? (payload.new as Bookmark) : b
              )
            )
          }

          // Force UI refresh if needed (rare)
          setForceRefreshKey((prev) => prev + 1)
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status)
        if (status === "SUBSCRIBED") {
          console.log("Real-time subscription active!")
        }
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          console.error("Real-time subscription failed:", status)
        }
      })

    setSubscription(channel)

    // Cleanup
    return () => {
      console.log("Cleaning up real-time subscription")
      supabase.removeChannel(channel)
      setSubscription(null)
    }
  }, [user?.id])

  // ─── FETCH BOOKMARKS ───────────────────────────────────────────────────
  const fetchBookmarks = async (userId: string) => {
    console.log("Fetching bookmarks for user:", userId)
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Fetch error:", error)
      toast.error("Failed to load bookmarks")
      return
    }

    if (data) {
      console.log("Fetched", data.length, "bookmarks")
      setBookmarks(data)
    }
  }

  // ─── LOGIN / LOGOUT ────────────────────────────────────────────────────
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { queryParams: { prompt: "select_account" } },
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  // ─── ADD BOOKMARK ──────────────────────────────────────────────────────
  const addBookmark = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error("Title and URL are required!")
      return
    }

    if (!user?.id) {
      toast.error("You must be logged in")
      return
    }

    const cleanUrl = url.trim().match(/^https?:\/\//) ? url.trim() : `https://${url.trim()}`

    const newBookmark = {
      title: title.trim(),
      url: cleanUrl,
      user_id: user.id,
      created_at: new Date().toISOString(),
    }

    try {
      const { error } = await supabase.from("bookmarks").insert([newBookmark])

      if (error) {
        console.error("Insert error:", error)
        toast.error(error.message || "Failed to add bookmark")
        return
      }

      setTitle("")
      setUrl("")
      toast.success("Bookmark added!")

      // Optimistic update
      setBookmarks((prev) => [{ ...newBookmark, id: "temp-" + Date.now() }, ...prev])
    } catch (err: any) {
      console.error("Unexpected add error:", err)
      toast.error("Unexpected error adding bookmark")
    }
  }

  // ─── DELETE BOOKMARK ───────────────────────────────────────────────────
  const deleteBookmark = async (id: string) => {
    try {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id)

      if (error) {
        console.error("Delete error:", error)
        toast.error("Failed to delete")
        return
      }

      toast.success("Deleted!")
      // Real-time will handle removal
    } catch (err: any) {
      console.error("Unexpected delete error:", err)
      toast.error("Unexpected error deleting")
    }
  }

  // ─── FILTERED LIST ─────────────────────────────────────────────────────
  const filteredBookmarks = bookmarks.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  )

  const totalBookmarks = bookmarks.length

  // ─── LOADING / NOT LOGGED IN ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900 font-semibold text-lg">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-96 text-center">
          <h1 className="text-3xl font-bold mb-6 text-indigo-800">Smart Bookmark</h1>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-700 text-white py-3 rounded-xl hover:bg-indigo-800 transition font-semibold"
          >
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

  // ─── MAIN UI ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 p-6" key={forceRefreshKey}>
      <Toaster position="top-right" reverseOrder={false} />

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-md">
        <div>
          <h1 className="text-3xl font-bold text-indigo-800">Smart Bookmark</h1>
          <p className="text-gray-700 font-medium">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {["dashboard", "analytics"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-semibold ${
              activeTab === tab
                ? "bg-indigo-600 text-white shadow"
                : "bg-white text-gray-800 shadow hover:bg-gray-50 transition"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="bg-white p-6 rounded-xl shadow mb-6 text-gray-800">
          <h2 className="text-xl font-semibold mb-4">Analytics Overview</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="font-medium text-gray-800">Total Bookmarks</p>
              <h3 className="text-2xl font-bold text-indigo-700">{totalBookmarks}</h3>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-medium text-gray-800">Account Type</p>
              <h3 className="text-2xl font-bold text-green-700">Google OAuth</h3>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <>
          <div className="bg-white p-6 rounded-xl shadow mb-6 relative">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-400 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder-gray-500"
              />
              <input
                type="text"
                placeholder="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="border border-gray-400 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder-gray-500"
              />
              <button
                onClick={addBookmark}
                className="bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Add
              </button>
            </div>

            {/* Search with suggestions */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search bookmarks..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setShowSuggestions(true)
                }}
                className="w-full border border-gray-400 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 placeholder-gray-500"
              />
              {showSuggestions && search && (
                <ul className="absolute z-10 w-full max-h-64 overflow-y-auto bg-white border border-gray-300 rounded-b-lg shadow-lg mt-1">
                  {bookmarks
                    .filter((b) => b.title.toLowerCase().includes(search.toLowerCase()))
                    .slice(0, 100)
                    .map((b) => (
                      <li
                        key={b.id}
                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-gray-900"
                        onClick={() => {
                          setSearch(b.title)
                          setShowSuggestions(false)
                        }}
                      >
                        {b.title} - <span className="text-indigo-600">{b.url}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          {/* Bookmark List */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition"
              >
                <h3 className="font-semibold text-gray-900">{bookmark.title}</h3>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-700 text-sm break-words hover:underline"
                >
                  {bookmark.url}
                </a>
                <div className="mt-4 text-right">
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}