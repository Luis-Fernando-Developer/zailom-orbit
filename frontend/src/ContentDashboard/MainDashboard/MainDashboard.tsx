// reset refresh

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import StaticsMain from './components/StaticsMain'
import WorkspacePages, { type WorkspacePage } from './components/WorkspacePages'

const pageIds: WorkspacePage[] = [
  'overview',
  'calendar',
  'posts',
  'inbox',
  'automations',
  'analytics',
  'marketing',
  'accounts',
  'library',
  'team',
  'settings',
]

function getPageFromHash(): WorkspacePage {
  const page = window.location.hash.replace('#page-', '') as WorkspacePage
  return pageIds.includes(page) ? page : 'overview'
}

export default function MainDashboard() {
  const [page, setPage] = useState<WorkspacePage>(getPageFromHash)
  const pageRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const updatePage = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  useEffect(() => {
    const surface = pageRef.current?.closest<HTMLElement>('.group-content-main')
    if (!surface || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return
    }

    let pressed = false
    let isScrolling = false
    let scrollIdleTimer: number | undefined
    const filterSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    filterSvg.setAttribute('aria-hidden', 'true')
    filterSvg.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none'
    filterSvg.innerHTML = `
      <filter id="liquid-glass-cursor-refraction" x="-40%" y="-40%" width="180%" height="180%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="2" result="liquid-map" />
        <feDisplacementMap in="SourceGraphic" in2="liquid-map" scale="5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    `
    document.body.appendChild(filterSvg)

    const bubble = document.createElement('div')
    bubble.className = 'liquid-glass-cursor'
    bubble.setAttribute('aria-hidden', 'true')
    document.body.appendChild(bubble)

    const isInsideSurface = (event: Pick<PointerEvent, 'clientX' | 'clientY'>) => {
      const bounds = surface.getBoundingClientRect()
      return (
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom
      )
    }

    const updateBubble = (x: number, y: number) => {
      bubble.style.left = `${x}px`
      bubble.style.top = `${y}px`
      bubble.style.display = 'block'
      bubble.classList.toggle('is-pressed', pressed)
      document.body.classList.add('liquid-glass-pointer-active')
    }

    const handleMouseMove = (event: Pick<MouseEvent, 'clientX' | 'clientY' | 'buttons'>) => {
      if (pressed && event.buttons === 0) pressed = false
      const keepActive = pressed || isScrolling
      isScrolling = false
      window.clearTimeout(scrollIdleTimer)
      if (!keepActive && !isInsideSurface(event)) {
        bubble.style.display = 'none'
        document.body.classList.remove('liquid-glass-pointer-active')
        return
      }
      updateBubble(event.clientX, event.clientY)
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') handleMouseMove(event)
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0 || !isInsideSurface(event)) return
      pressed = true
      updateBubble(event.clientX, event.clientY)
    }
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 || !isInsideSurface(event)) return
      pressed = true
      updateBubble(event.clientX, event.clientY)
    }
    const handlePointerUp = (event: PointerEvent) => {
      if (!pressed) return
      window.clearTimeout(scrollIdleTimer)
      pressed = false
      isScrolling = false
      if (!isInsideSurface(event)) {
        bubble.style.display = 'none'
        document.body.classList.remove('liquid-glass-pointer-active')
        return
      }
      updateBubble(event.clientX, event.clientY)
    }
    const handleMouseUp = (event: MouseEvent) => {
      if (!pressed) return
      window.clearTimeout(scrollIdleTimer)
      pressed = false
      isScrolling = false
      if (!isInsideSurface(event)) {
        bubble.style.display = 'none'
        document.body.classList.remove('liquid-glass-pointer-active')
        return
      }
      updateBubble(event.clientX, event.clientY)
    }
    const handlePointerLeave = (event: PointerEvent) => {
      if (pressed || isScrolling || isInsideSurface(event)) return
      bubble.style.display = 'none'
      document.body.classList.remove('liquid-glass-pointer-active')
    }

    const handleWindowBlur = () => {
      pressed = false
      isScrolling = false
      window.clearTimeout(scrollIdleTimer)
      bubble.style.display = 'none'
      document.body.classList.remove('liquid-glass-pointer-active')
    }

    const handleScroll = () => {
      if (!document.body.classList.contains('liquid-glass-pointer-active')) return
      isScrolling = true
      bubble.style.display = 'none'
      window.clearTimeout(scrollIdleTimer)
      scrollIdleTimer = window.setTimeout(() => {
        isScrolling = false
      }, 300)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('pointercancel', handlePointerUp)
    window.addEventListener('pointerleave', handlePointerLeave)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      window.removeEventListener('pointerleave', handlePointerLeave)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('scroll', handleScroll, true)
      window.clearTimeout(scrollIdleTimer)
      document.body.classList.remove('liquid-glass-pointer-active')
      bubble.remove()
      filterSvg.remove()
    }
  }, [])

  useLayoutEffect(() => {
    const element = pageRef.current
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.fromTo(
      element,
      { opacity: 0.65, y: 8, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.42, ease: 'power2.out' },
    )
  }, [page])

  return (
    <div
      ref={pageRef}
      className="min-w-0 min-h-0 flex-1 flex h-full overflow-hidden"
    >
      {page === 'overview' ? <StaticsMain /> : <WorkspacePages page={page} />}
    </div>
  )
}
