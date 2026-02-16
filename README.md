# 🔖 Smart Bookmark App

A modern full-stack bookmark manager built with **Next.js**, **Supabase**, and **Tailwind CSS**.

This application allows users to securely log in with Google, add bookmarks, search through them, and manage everything in real-time with a clean white professional interface.

---

## 🚀 Live Demo

🌍 Deployed on Vercel  
👉 https://smart-bookmark-app-pi-vert.vercel.app/

---

## ✨ Features

- 🔐 Google OAuth Authentication (Supabase)
- ➕ Add bookmarks with automatic URL formatting
- 🔎 Real-time search functionality
- 📊 Analytics dashboard
- 🗑 Delete bookmarks
- ⚡ Real-time updates using Supabase Realtime
- 🎨 Clean and responsive UI with Tailwind CSS
- ☁️ Production deployment on Vercel

---

## 🛠 Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Backend & Database:** Supabase
- **Authentication:** Google OAuth (via Supabase)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

---

## 📂 Project Structure

```
app/
  ├── page.tsx        # Main application UI and logic

lib/
  ├── supabase.ts     # Supabase client configuration
```

---

## ⚙️ Environment Variables

Create a `.env.local` file in your root folder and add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Make sure to also add these variables inside:

Vercel → Project → Settings → Environment Variables

---

## 🧑‍💻 Getting Started (Local Development)

1. Clone the repository:

```bash
git clone https://github.com/pragna-bn/smart-bookmark-app
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open your browser and visit:

```
http://localhost:3000
```

---

## 📌 Future Improvements

- ✏️ Edit bookmark feature
- 🏷 Bookmark categories or tags
- 🌙 Optional dark mode
- 👤 User profile settings

---

## 👨‍💻 Author

Built with ❤️ using Next.js and Supabase.

---

## 📄 License

This project is open-source and available under the MIT License.
