declare module 'https://liquidglass.dev/lib/liquid-glass.js' {
  export interface GlassOptions {
    x?: number
    y?: number
    width?: number
    height?: number
    radius?: number
    refraction?: number
    bezel?: number
    curvature?: number
    ior?: number
    chroma?: number
    blur?: number
    specular?: number
    specularWidth?: number
    lightAngle?: number
    hidden?: boolean
    fit?: boolean
    sync?: boolean
  }

  export interface GlassInstance {
    update(options?: GlassOptions): void
    destroy(): void
  }

  export function createGlass(target: HTMLElement, options?: GlassOptions): GlassInstance
}
