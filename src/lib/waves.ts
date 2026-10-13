// Animated "thinking" strings for the processing screen. Each string is a sine wave
// with its own phase and frequency; an envelope pins all strings together at both ends.
const SVG_NS = 'http://www.w3.org/2000/svg'
const STEPS = 72

export const wavePath = (i: number, count: number, t: number, width: number, height: number): string => {
  const mid = height / 2
  const phase = (i / count) * Math.PI * 2
  const freq = 1.2 + 0.4 * Math.sin(i * 1.7)
  const amp = height * 0.4 * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.5 + phase)))
  const points = Array.from({ length: STEPS + 1 }, (_, k) => {
    const x = k / STEPS
    const envelope = Math.sin(Math.PI * x) ** 2
    const y = mid + amp * envelope * Math.sin(2 * Math.PI * freq * x - t * 1.6 + phase)
    return `${(x * width).toFixed(1)} ${y.toFixed(1)}`
  })
  return `M ${points.join(' L ')}`
}

// Draws `count` strings into the svg and animates them; returns a cleanup function
export const animateWaves = (svg: SVGSVGElement, count = 7): (() => void) => {
  const { width, height } = svg.viewBox.baseVal
  const paths = Array.from({ length: count }, (_, i) => {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('stroke-opacity', String(0.3 + (0.6 * (i + 1)) / count))
    svg.appendChild(path)
    return path
  })
  const draw = (t: number) => paths.forEach((p, i) => p.setAttribute('d', wavePath(i, count, t, width, height)))

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let frame = 0
  const loop = (ms: number) => {
    draw(ms / 1000)
    frame = requestAnimationFrame(loop)
  }
  if (reduced) draw(1)
  else frame = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(frame)
    paths.forEach(p => p.remove())
  }
}
