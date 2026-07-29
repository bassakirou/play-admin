import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { Permission } from './rbac'

type User = {
  id: string
  email: string
  role?: any
  roleId?: string
  roleObject?: any
  name?: string
}

type AuthContextType = {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  permissions: Permission[] | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<Permission[] | null>(null)

  useEffect(() => {
    const t = localStorage.getItem('pp_admin_token')
    const u = localStorage.getItem('pp_admin_user')
    const p = localStorage.getItem('pp_admin_permissions')
    
    if (t) setToken(t)
    if (u) {
      try {
        const parsedUser = JSON.parse(u)
        setUser(parsedUser)
        
        if (p) {
          try {
            setPermissions(JSON.parse(p))
          } catch {
            // ignore JSON error
          }
        }
        
        // Background sync role permissions from API if roleId is available
        const roleId = parsedUser?.roleId || parsedUser?.roleObject?.id
        if (roleId) {
          api.get(`/roles/${roleId}`)
            .then((res) => {
              if (res.data?.permissions) {
                setPermissions(res.data.permissions)
                localStorage.setItem('pp_admin_permissions', JSON.stringify(res.data.permissions))
              }
            })
            .catch(() => {})
        }
      } catch {
        // ignore parse error
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const { access_token, user } = res.data
    const t = access_token
    const roleObj = typeof user?.role === 'object' ? user.role : null
    const roleName = roleObj?.name ?? user?.role ?? 'USER'
    const roleId = roleObj?.id || user?.roleId
    
    const u = {
      ...user,
      role: roleName,
      roleId: roleId,
      roleObject: roleObj,
    }

    localStorage.setItem('pp_admin_token', t)
    localStorage.setItem('pp_admin_user', JSON.stringify(u))
    setToken(t)
    setUser(u)

    let perms: Permission[] | null = null
    if (roleObj?.permissions && Array.isArray(roleObj.permissions)) {
      perms = roleObj.permissions
    } else if (roleId) {
      try {
        const roleRes = await api.get(`/roles/${roleId}`)
        perms = roleRes.data?.permissions || null
      } catch {
        perms = null
      }
    }

    if (perms) {
      setPermissions(perms)
      localStorage.setItem('pp_admin_permissions', JSON.stringify(perms))
    } else {
      localStorage.removeItem('pp_admin_permissions')
      setPermissions(null)
    }
  }

  const logout = () => {
    localStorage.removeItem('pp_admin_token')
    localStorage.removeItem('pp_admin_user')
    localStorage.removeItem('pp_admin_permissions')
    setToken(null)
    setUser(null)
    setPermissions(null)
  }

  const value = useMemo(
    () => ({ user, token, loading, login, logout, permissions }),
    [user, token, loading, permissions]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
