import * as dat from 'dat.gui'
import { ds, OutputMap } from 'ds-heightmap'
import { Three } from './three'

interface Config {
  depth: number
  height: number
  rough: number
  sea: boolean
  seaLevel: number
  smooth: number
  width: number
}

const SEGMENT_SIZE_MAX = 10
const SEGMENT_SIZE_MIN = 2
const ORIGINAL_PLANE_Y = -200

const DEFAULT_CONFIG: Config = {
  depth: 2000,
  height: 0,
  rough: 1,
  sea: true,
  seaLevel: ORIGINAL_PLANE_Y,
  smooth: 0.8,
  width: 0,
}

class App {
  private canvas2d = document.createElement('canvas')
  private canvas2dImageData: ImageData | null = null
  private ctx2d: CanvasRenderingContext2D
  private data: OutputMap | null = null
  private gui = new dat.GUI()
  private mouseX = 0
  private mouseY = 0
  private threeContainer = document.createElement('div')
  private three: Three

  constructor(private config: Config) {
    this.canvas2d.style.width = '50%'
    this.threeContainer.style.width = '50%'

    document.body.append(this.canvas2d)
    document.body.append(this.threeContainer)
    this.three = new Three(
      this.threeContainer,
      window.devicePixelRatio,
      this.calcSegmentSize(),
      ORIGINAL_PLANE_Y,
      this.config.seaLevel
    )
    this.three.setSeaVisibility(this.config.sea)

    this.ctx2d = this.canvas2d.getContext('2d') as CanvasRenderingContext2D
    if (this.ctx2d === null) {
      throw 'canvas context is null'
    }

    this.handleCanvasResize()
    window.addEventListener('resize', () => {
      this.handleResize()
      this.update()
    })

    window.addEventListener('mousemove', (e) => {
      this.handleMouseMove(e.clientX, e.clientY)
      this.render()
    })

    this.gui.add(this.config, 'depth', 1000, 3000, 1).onChange((v) => {
      this.update()
    })
    this.gui.add(this.config, 'rough', 0, 1.5, 0.1).onChange((v) => {
      this.update()
    })
    this.gui.add(this.config, 'smooth', 0, 1, 0.1).onChange((v) => {
      this.three.changeSegmentSize(this.calcSegmentSize())
      this.three.updateMesh()
      this.three.update()
    })
    this.gui.add(this.config, 'sea').onChange((v) => {
      this.generate2d()
      this.three.setSeaVisibility(v)

      this.render()
    })
    this.gui.add(this.config, 'seaLevel', -300, -100, 10).onChange((v) => {
      this.generate2d()
      this.three.changeSeaLevel(v)

      this.render()
    })
    this.gui.add(this, 'update')
  }

  update() {
    this.generate()
    this.render()
  }

  private calcSegmentSize(): number {
    return Math.round(SEGMENT_SIZE_MIN + SEGMENT_SIZE_MAX * this.config.smooth)
  }

  private generate() {
    this.data = ds(this.config)

    this.generate2d()
    this.generate3d()
  }

  private generate2d() {
    if (this.data === null) return

    const { max, min, data } = this.data

    const width = data.length
    if (width <= 0) {
      throw 'Invalid data'
    }
    const height = data[0].length

    const baseRange = max - min
    const minHeight = this.config.sea
      ? baseRange / 2 + min + (this.config.seaLevel - ORIGINAL_PLANE_Y) * 2
      : min

    const range = max - minHeight
    const colorData: number[] = []
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (this.config.sea && data[j][i] < minHeight) {
          colorData.push(167, 223, 210, 255)
          continue
        }

        const level = (data[j][i] - minHeight) / range
        if (level > 0.9) {
          colorData.push(224, 222, 216, 255)
        } else if (level > 0.8) {
          colorData.push(186, 174, 154, 255)
        } else if (level > 0.7) {
          colorData.push(185, 152, 90, 255)
        } else if (level > 0.6) {
          colorData.push(202, 185, 130, 255)
        } else if (level > 0.5) {
          colorData.push(222, 214, 163, 255)
        } else if (level > 0.4) {
          colorData.push(239, 235, 192, 255)
        } else if (level > 0.3) {
          colorData.push(209, 215, 171, 255)
        } else if (level > 0.2) {
          colorData.push(189, 204, 150, 255)
        } else if (level > 0.1) {
          colorData.push(168, 198, 143, 255)
        } else {
          colorData.push(148, 191, 139, 255)
        }
      }
    }

    this.canvas2dImageData = new ImageData(
      Uint8ClampedArray.from(colorData),
      width,
      height
    )
  }

  private generate3d() {
    if (this.data === null) return

    const { max, min, data } = this.data

    this.three.setData(data, max, min)
    this.three.updateMesh()
  }

  private handleMouseMove(x: number, y: number) {
    if (x > this.canvas2d.width) {
      const [nx, ny] = this.three.hitTest(x - this.canvas2d.width, y)
      this.mouseX = nx
      this.mouseY = ny
    }
  }

  private handleCanvasResize() {
    this.config.width = Math.floor(this.canvas2d.clientWidth)
    this.config.height = Math.floor(this.canvas2d.clientHeight)

    this.canvas2d.width = this.config.width
    this.canvas2d.height = this.config.height
  }

  private handleResize() {
    this.handleCanvasResize()

    this.three.resize(
      this.threeContainer.clientWidth,
      this.threeContainer.clientHeight
    )
    this.three.update()
  }

  private render() {
    this.render2d()
    this.three.update()
  }

  private render2d() {
    if (this.canvas2dImageData === null) return

    this.ctx2d.clearRect(0, 0, this.canvas2d.width, this.canvas2d.height)
    this.ctx2d.putImageData(this.canvas2dImageData, 0, 0)

    this.ctx2d.beginPath()
    this.ctx2d.arc(this.mouseX, this.mouseY, 10, 0, Math.PI * 2)
    this.ctx2d.fillStyle = '#ffffff66'
    this.ctx2d.fill()
    this.ctx2d.closePath()
  }
}

function runApp() {
  const app = new App(DEFAULT_CONFIG)
  app.update()
}

export { runApp }
