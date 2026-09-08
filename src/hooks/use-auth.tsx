import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { AppUser } from '@/services/api'

export type UserRole = 'master' | 'gestor' | 'portaria' | 'porteiro' | 'triagem' | 'morador' | null

interface AuthContextType {
  user: AppUser | null
  role: UserRole
  isAuthenticated: boolean
  licenseExpired: boolean
  checkLicenseStatus: () => Promise<boolean>
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: any; record?: any; licenseExpired?: boolean }>
  signOut: () => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(
    pb.authStore.isValid ? (pb.authStore.record as unknown as AppUser) : null,
  )
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [licenseExpired, setLicenseExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  const checkLicenseStatus = async (): Promise<boolean> => {
    if (!pb.authStore.isValid) {
      setLicenseExpired(false)
      return false
    }

    const currentRecord = pb.authStore.record as unknown as AppUser
    // Usuários master nunca são bloqueados por licença
    if (currentRecord?.role === 'master') {
      setLicenseExpired(false)
      return false
    }

    try {
      const res: any = await pb.send('/backend/v1/licenca/status', {
        method: 'GET',
        requestKey: null,
      })

      const isBlocked = !!res.bloqueado
      setLicenseExpired(isBlocked)
      return isBlocked
    } catch (e) {
      console.error('Erro ao verificar status de licença:', e)
      return false
    }
  }

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? (record as unknown as AppUser) : null)
      setIsAuthenticated(pb.authStore.isValid)
      if (pb.authStore.isValid) {
        checkLicenseStatus()
      } else {
        setLicenseExpired(false)
      }
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then(() => checkLicenseStatus())
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
      const authData = await pb.collection('users').authWithPassword(email, password)
      let isExpired = false
      if (authData.record?.role !== 'master') {
        isExpired = await checkLicenseStatus()
      }
      return { error: null, record: authData.record, licenseExpired: isExpired }
    } catch (error) {
      return { error, record: null, licenseExpired: false }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  const logout = () => signOut()

  const role = (user?.role as UserRole) || null

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        licenseExpired,
        checkLicenseStatus,
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
