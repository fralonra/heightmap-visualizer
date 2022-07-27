import {
  BufferAttribute,
  Color,
  ConeGeometry,
  HemisphereLight,
  Mesh,
  MeshNormalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

class Three {
  private camera: PerspectiveCamera
  private data: number[][] = []
  private height = 0
  private geometry: PlaneGeometry
  private geometryHelper: ConeGeometry
  private geometryHelperMesh: Mesh
  private material: MeshStandardMaterial
  private maxHeight = 0
  private mesh: Mesh
  private minHeight = 0
  private raycaster = new Raycaster()
  private renderer = new WebGLRenderer({ antialias: true })
  private scene = new Scene()
  private seaGeometry: PlaneGeometry
  private seaMesh: Mesh
  private segmentWidth = 0
  private segmentHeight = 0
  private width = 0

  constructor(
    container: HTMLElement,
    devicePixelRatio: number,
    private segmentSize: number,
    planeY: number,
    seaLevel: number
  ) {
    this.width = container.clientWidth
    this.height = container.clientHeight

    this.segmentWidth = Math.floor(this.width / this.segmentSize)
    this.segmentHeight = Math.floor(this.height / this.segmentSize)

    this.camera = new PerspectiveCamera(80, this.width / this.height, 0.1, 1000)
    this.camera.position.y = 400

    this.renderer.setPixelRatio(devicePixelRatio)
    this.renderer.setSize(this.width, this.height)
    this.renderer.physicallyCorrectLights = true

    this.scene.background = new Color(0xf0f0f0)

    this.geometry = new PlaneGeometry(
      this.width,
      this.height,
      this.segmentWidth,
      this.segmentHeight
    )
    this.geometry.rotateX(-Math.PI / 2)

    this.geometryHelper = new ConeGeometry(20, 20, 3)
    this.geometryHelper.translate(0, 10, 0)
    this.geometryHelper.rotateX(Math.PI / 2)

    this.geometryHelperMesh = new Mesh(
      this.geometryHelper,
      new MeshNormalMaterial()
    )
    this.scene.add(this.geometryHelperMesh)

    this.material = new MeshStandardMaterial()

    this.mesh = new Mesh(this.geometry, this.material)
    this.mesh.position.y = planeY
    this.scene.add(this.mesh)

    this.seaGeometry = new PlaneGeometry(this.width, this.height)
    this.seaGeometry.rotateX(-Math.PI / 2)

    this.seaMesh = new Mesh(
      this.seaGeometry,
      new MeshStandardMaterial({
        color: '#00a2ff',
      })
    )
    this.seaMesh.position.y = seaLevel
    this.scene.add(this.seaMesh)

    {
      const light = new HemisphereLight(0xffffbb, 0x080820, 2)
      this.scene.add(light)
    }

    {
      const controls = new OrbitControls(this.camera, this.renderer.domElement)
      controls.enablePan = false
      controls.enableZoom = false
      controls.addEventListener('change', () => {
        this.update()
      })
    }

    container.appendChild(this.renderer.domElement)
  }

  changeSeaLevel(seaLevel: number) {
    this.seaMesh.position.y = seaLevel
  }

  changeSegmentSize(segmentSize: number) {
    this.segmentSize = segmentSize

    this.segmentWidth = Math.floor(this.width / this.segmentSize)
    this.segmentHeight = Math.floor(this.height / this.segmentSize)

    this.constructGeometry()
  }

  hitTest(x: number, y: number): [number, number] {
    x = (x / this.width) * 2 - 1
    y = 1 - (y / this.height) * 2

    this.raycaster.setFromCamera(new Vector2(x, y), this.camera)

    const intersects = this.raycaster.intersectObject(this.mesh)

    if (intersects.length > 0) {
      const intersect = intersects[0]
      this.geometryHelperMesh.position.set(0, 0, 0)
      if (intersect.face !== null && intersect.face !== undefined) {
        this.geometryHelperMesh.lookAt(intersect.face.normal)
      }
      this.geometryHelperMesh.position.copy(intersect.point)

      return [
        intersect.point.x + this.width / 2,
        intersect.point.z + this.height / 2,
      ]
    }
    return [-100, -100]
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height

    this.segmentWidth = Math.floor(this.width / this.segmentSize)
    this.segmentHeight = Math.floor(this.height / this.segmentSize)

    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)

    this.constructGeometry()
  }

  setData(data: number[][], max: number, min: number) {
    this.data = data
    this.maxHeight = max
    this.minHeight = min
  }

  setSeaVisibility(visible: boolean) {
    this.seaMesh.visible = visible
  }

  update() {
    this.renderer.render(this.scene, this.camera)
  }

  updateMesh() {
    const width = this.data.length
    if (width <= 0) {
      throw 'Invalid data'
    }
    const height = this.data[0].length

    const vertices = this.geometry.getAttribute('position') as BufferAttribute

    const segmentWidth = this.segmentWidth + 1
    const segmentHeight = this.segmentHeight + 1
    const xStep = Math.round(width / segmentWidth)
    const yStep = Math.round(height / segmentHeight)
    const mid = (this.maxHeight - this.minHeight) / 2 + this.minHeight

    for (let x = 0; x < segmentWidth; x++) {
      for (let y = 0; y < segmentHeight; y++) {
        const i = y * segmentWidth + x

        let xCoordinate = xStep * x
        if (xCoordinate >= width) xCoordinate = width - 1

        let yCoordinate = yStep * y
        if (yCoordinate >= height) yCoordinate = height - 1

        vertices.setY(i, (this.data[xCoordinate][yCoordinate] - mid) / 2)
      }
    }

    vertices.needsUpdate = true
    this.geometry.computeVertexNormals()
  }

  private constructGeometry() {
    {
      this.geometry = new PlaneGeometry(
        this.width,
        this.height,
        this.segmentWidth,
        this.segmentHeight
      )

      this.geometry.rotateX(-Math.PI / 2)

      this.mesh.geometry = this.geometry
    }

    {
      this.seaGeometry = new PlaneGeometry(this.width, this.height)

      this.seaGeometry.rotateX(-Math.PI / 2)

      this.seaMesh.geometry = this.seaGeometry
    }
  }
}

export { Three }
