import { createContext, useContext, useState, ReactNode } from 'react'

export type UserRole = 'gestor' | 'portaria' | 'morador' | null

interface AuthContextType {
  role: UserRole
  login: (role: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(null)

  const login = (newRole: UserRole) => {
    setRole(newRole)
  }

  const logout = () => {
    setRole(null)
  }

  return <AuthContext.Provider value={{ role, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
