import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Отслеживает, помещается ли вьюпорт в мобильный брейкпоинт (совпадает с
 * Tailwind `md`). Используется, чтобы сайдбар и контент не показывались
 * одновременно бок о бок на телефоне.
 */
export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  )

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}
