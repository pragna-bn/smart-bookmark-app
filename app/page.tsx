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
  const [forceRefreshKey, setForceRefreshKey] = useState(0)

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

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`bookmarks-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBookmarks((current) => {
              if (current.some(b => b.id === payload.new.id)) return current
              return [payload.new as Bookmark, ...current]
            })
          }

          if (payload.eventType === "DELETE") {
            setBookmarks((current) =>
              current.filter((b) => b.id !== payload.old.id)
            )
          }

          if (payload.eventType === "UPDATE") {
            setBookmarks((current) =>
              current.map((b) =>
                b.id === payload.new.id ? (payload.new as Bookmark) : b
              )
            )
          }

          setForceRefreshKey((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const fetchBookmarks = async (userId: string) => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      toast.error("Failed to load bookmarks")
      return
    }

    if (data) setBookmarks(data)
  }

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

  const addBookmark = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error("Title and URL are required!")
      return
    }

    if (!user?.id) {
      toast.error("You must be logged in")
      return
    }

    const cleanUrl = url.trim().match(/^https?:\/\//)
      ? url.trim()
      : `https://${url.trim()}`

    const { error } = await supabase.from("bookmarks").insert([
      {
        title: title.trim(),
        url: cleanUrl,
        user_id: user.id,
      },
    ])

    if (error) {
      toast.error(error.message)
      return
    }

    setTitle("")
    setUrl("")
    toast.success("Bookmark added!")
  }

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("Failed to delete")
      return
    }

    toast.success("Deleted!")
  }

  const filteredBookmarks = bookmarks.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  )

  const totalBookmarks = bookmarks.length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-800 text-lg font-semibold">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white border border-gray-200 p-10 rounded-2xl shadow-lg w-96 text-center">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            Smart Bookmark
          </h1>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-semibold shadow-md"
          >
            Continue with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-6" key={forceRefreshKey}>
      <Toaster position="top-right" />

      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Smart Bookmark
          </h1>
          <p className="text-gray-700 font-medium mt-1">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium shadow"
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
            className={`px-5 py-2 rounded-lg font-semibold border ${
              activeTab === tab
                ? "bg-indigo-600 text-white border-indigo-600 shadow"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "analytics" && (
        <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Analytics Overview
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <p className="text-gray-700 font-medium">Total Bookmarks</p>
              <h3 className="text-2xl font-bold text-gray-900">
                {totalBookmarks}
              </h3>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <p className="text-gray-700 font-medium">Account Type</p>
              <h3 className="text-2xl font-bold text-gray-900">
                Google OAuth
              </h3>
            </div>
          </div>
        </div>
      )}

      {activeTab === "dashboard" && (
        <>
          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm mb-6">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-gray-300 text-gray-900 placeholder-gray-500 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="border border-gray-300 text-gray-900 placeholder-gray-500 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={addBookmark}
                className="bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 shadow-md"
              >
                Add Bookmark
              </button>
            </div>

            <input
              type="text"
              placeholder="Search bookmarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 text-gray-900 placeholder-gray-500 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <h3 className="font-bold text-gray-900 text-lg">
                  {bookmark.title}
                </h3>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 text-sm break-words hover:underline"
                >
                  {bookmark.url}
                </a>
                <div className="mt-4 text-right">
                  <button
                    onClick={() => deleteBookmark(bookmark.id)}
                    className="text-red-600 font-medium text-sm hover:underline"
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