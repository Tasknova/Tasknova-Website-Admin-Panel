'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { LogIn } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Login failed')
        return
      }

      toast.success('Login successful!')
      router.push('/admin/dashboard')
      router.refresh()
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-md border border-gray-100">
        <div className="flex justify-center mb-8">
          <Image
            src="/tasknova-logo-2.png"
            alt="Tasknova Logo"
            width={180}
            height={60}
            priority
            className="object-contain"
          />
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">Admin Portal</h1>
        <p className="text-gray-600 text-center mb-8">
          Sign in to access the admin panel
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="admin@tasknova.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Tasknova © {new Date().getFullYear()} • All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}
