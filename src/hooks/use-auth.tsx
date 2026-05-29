import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { AppUser } from '@/services/api'

export type UserRole = 'gestor' | 'portaria' | 'morador' | null

interface AuthContextType {
  user: AppUser | null
  role: UserRole
  isAuthenticated: boolean
  login: (role: UserRole) => void
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(
    pb.authStore.isValid ? (pb.authStore.record as AppUser) : null,
  )
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  // Keep this for backwards compatibility if some mock code is still using it
  const [mockRole, setMockRole] = useState<UserRole>(null)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? (record as AppUser) : null)
      setIsAuthenticated(pb.authStore.isValid)
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      setMockRole(null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setMockRole(null)
  }

  // Compat methods
  const login = (role: UserRole) => setMockRole(role)
  const logout = () => signOut()

  const role = mockRole || (user?.role as UserRole) || null
  const isAppAuthenticated = isAuthenticated || mockRole !== null

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: isAppAuthenticated,
        login,
        signIn,
        signOut,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
