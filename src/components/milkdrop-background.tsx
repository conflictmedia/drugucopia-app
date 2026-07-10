'use client'

import { useRef, useEffect, useState } from 'react'
import { useVisualizerStore } from '@/store/visualizer-store'

// Simple, reliable shader that produces bright, vibrant colors
const VERT_SRC = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

// Fast-moving shader with increased animation speed
const FRAG_SRC = `
precision mediump float;
varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uIntensity;
uniform float uPreset;
uniform float uIsDark;

// Simple hash for noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D value noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM with 3 octaves
float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amp * noise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
    p += vec2(1.7, 9.2);
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  
  // FAST: main time multiplier increased from 0.08 to 0.15
  float t = uTime * 0.15;

  // FAST: domain warp time factors increased
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0) + t * 0.2),
    fbm(p + vec2(5.2, 1.3) + t * 0.25)
  );
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.16),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.18)
  );
  vec2 warped = p + 1.2 * r;

  // FAST: FBM sampling time factors increased
  float f1 = fbm(warped * 1.2 + t * 0.4);
  float f2 = fbm(warped * 2.5 - t * 0.3 + vec2(5.0));
  float pattern = f1 * 0.6 + f2 * 0.4;
  pattern = clamp(pattern, 0.0, 1.0);

  // Color palette based on preset
  vec3 col;
  float pres = uPreset;
  
  if (pres < 0.5) {
    col = 0.5 + 0.5 * cos(6.28318 * (pattern * 1.0 + vec3(0.0, 0.33, 0.67)));
  } else if (pres < 1.5) {
    col = 0.5 + 0.5 * cos(6.28318 * (pattern * 1.0 + vec3(0.0, 0.15, 0.20)));
  } else if (pres < 2.5) {
    col = 0.5 + 0.5 * cos(6.28318 * (pattern * 1.5 + vec3(0.50, 0.20, 0.25)));
  } else {
    col = 0.5 + 0.5 * cos(6.28318 * (pattern * 0.8 + vec3(0.80, 0.90, 0.30)));
  }

  // FAST: sparkle speed increased from 3.0 to 6.0
  col += 0.08 * sin(pattern * 30.0 + t * 6.0);

  // Vignette (subtle)
  float vignette = 1.0 - 0.2 * length(uv - 0.5);
  col *= vignette;

  // Mouse glow
  vec2 mouse = uMouse;
  mouse.x *= aspect;
  float mouseDist = length(p - mouse);
  float mouseGlow = exp(-mouseDist * 6.0) * 0.25;
  col += mouseGlow * vec3(1.0, 0.8, 0.6);

  // Apply intensity
  col *= uIntensity;

  // Theme adaptation
  if (uIsDark < 0.5) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 0.4);
    col *= 0.6;
  } else {
    col = pow(col, vec3(0.95));
    col *= 1.1;
  }

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

interface MilkdropBackgroundProps {
  isDark: boolean
}

export function MilkdropBackground({ isDark }: MilkdropBackgroundProps) {
  const [useFallback, setUseFallback] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const animFrameRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const mouseRef = useRef<[number, number]>([0.5, 0.5])
  const intensityRef = useRef(1.0)
  const presetRef = useRef(0)
  const enabledRef = useRef(true)
  const isDarkRef = useRef(isDark ? 1.0 : 0.0)
  const targetIsDarkRef = useRef(isDark ? 1.0 : 0.0)

  const { enabled, intensity, preset } = useVisualizerStore()

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  useEffect(() => {
    enabledRef.current = enabled
    intensityRef.current = intensity
    presetRef.current = preset
  }, [enabled, intensity, preset])

  useEffect(() => {
    targetIsDarkRef.current = isDark ? 1.0 : 0.0
  }, [isDark])

  useEffect(() => {
    if (!enabled || isMobile) return

    // Create canvas directly on body
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.display = 'block'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '-1'
    canvas.style.backgroundColor = '#1a1a2e'
    canvas.setAttribute('data-testid', 'milkdrop-canvas')
    document.body.appendChild(canvas)

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    })

    if (!gl) {
      console.warn('WebGL not available — using CSS fallback')
      setUseFallback(true)
      return
    }

    const compileShader = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vert = compileShader(gl.VERTEX_SHADER, VERT_SRC)
    const frag = compileShader(gl.FRAGMENT_SHADER, FRAG_SRC)

    if (!vert || !frag) {
      console.warn('Shader compilation failed — using CSS fallback')
      setUseFallback(true)
      return
    }

    const program = gl.createProgram()
    if (!program) {
      setUseFallback(true)
      return
    }
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link failed — using CSS fallback')
      setUseFallback(true)
      return
    }

    gl.useProgram(program)

    // Fullscreen quad
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const aPosition = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    // Uniforms
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uMouse = gl.getUniformLocation(program, 'uMouse')
    const uIntensity = gl.getUniformLocation(program, 'uIntensity')
    const uPreset = gl.getUniformLocation(program, 'uPreset')
    const uIsDark = gl.getUniformLocation(program, 'uIsDark')

    startTimeRef.current = performance.now() / 1000

    // Size update
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const w = Math.floor(window.innerWidth * dpr * 0.6)
      const h = Math.floor(window.innerHeight * dpr * 0.6)
      if (w > 0 && h > 0) {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
          gl.viewport(0, 0, w, h)
        }
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    // Mouse
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = [e.clientX / window.innerWidth, 1.0 - e.clientY / window.innerHeight]
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    // Render loop
    const render = () => {
      if (!enabledRef.current) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      const diff = targetIsDarkRef.current - isDarkRef.current
      isDarkRef.current += diff * 0.05

      const time = performance.now() / 1000 - startTimeRef.current

      gl.uniform1f(uTime, time)
      gl.uniform2f(uResolution, canvas.width, canvas.height)
      gl.uniform2f(uMouse, mouseRef.current[0], mouseRef.current[1])
      gl.uniform1f(uIntensity, intensityRef.current)
      gl.uniform1f(uPreset, presetRef.current)
      gl.uniform1f(uIsDark, isDarkRef.current)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('mousemove', onMouse)
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
    }
  }, [enabled, isMobile])

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: 'linear-gradient(135deg, #0a1f44, #0d2a5c, #08163a)',
        }}
      />
    )
  }

  if (!enabled) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: isDark ? '#121214' : '#fafafa',
        }}
      />
    )
  }

  // Bright, colorful CSS fallback with faster animation
  if (useFallback) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: 'linear-gradient(135deg, #1a0a2e, #2d1b69, #1a3a6a, #0d4a5a)',
          backgroundSize: '400% 400%',
          animation: 'gradientMove 6s ease-in-out infinite',
        }}
      />
    )
  }

  return null
}
