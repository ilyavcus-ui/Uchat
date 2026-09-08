import { useState } from 'react'

/**
 * Обёртка над fetch с общим состоянием loading/globalError,
 * которое используют все операции чата.
 */
export default function useApi() {
  const [loading, setLoading] = useState({})
  const [globalError, setGlobalError] = useState(null)

  const api = async (endpoint, options = {}) => {
    const key = options.loadingKey || endpoint
    setLoading(prev => ({ ...prev, [key]: true }))
    setGlobalError(null)
    try {
      const isFormData = options.body instanceof FormData
      const res = await fetch(endpoint, {
        headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
        ...options
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Error ${res.status}`)
      }
      return await res.json()
    } catch (e) {
      if (e.message !== 'Failed to fetch') setGlobalError(e.message)
      throw e
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  return { api, loading, globalError }
}
