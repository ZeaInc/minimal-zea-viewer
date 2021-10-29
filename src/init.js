/* eslint-disable require-jsdoc */
export default function init() {
  const { Color, Vec3, Scene, GLRenderer, EnvMap, resourceLoader, GeomItem, MeshProxy, LinesProxy, AssetLoadContext } =
    zeaEngine
  const { CADAsset, CADBody } = zeaCad

  const urlParams = new URLSearchParams(window.location.search)
  const scene = new Scene()
  scene.setupGrid(10.0, 10)

  const renderer = new GLRenderer(document.getElementById('canvas'), {
    debugGeomIds: false,
  })

  // renderer.solidAngleLimit = 0.0;
  renderer.setScene(scene)
  renderer.getViewport().getCamera().setPositionAndTarget(new Vec3(12, 12, 10), new Vec3(0, 0, 1.5))

  const envMap = new EnvMap()
  envMap.load('./data/StudioG.zenv')
  scene.setEnvMap(envMap)

  // Setup FPS Display
  const fpsElement = document.getElementById('fps')
  fpsElement.renderer = renderer

  // Setup TreeView Display
  const treeElement = document.getElementById('tree')
  treeElement.setTreeItem(scene.getRoot(), {
    scene,
    renderer,
  })

  // let highlightedItem
  const highlightColor = new Color('#F9CE03')
  highlightColor.a = 0.1
  const filterItem = (item) => {
    while (item && !(item instanceof CADBody)) item = item.getOwner()
    return item
  }
  // renderer.getViewport().on('pointerOverGeom', (event) => {
  //   highlightedItem = filterItem(event.intersectionData.geomItem)
  //   if (highlightedItem) highlightedItem.addHighlight('pointerOverGeom', highlightColor, true)
  // })
  // renderer.getViewport().on('pointerLeaveGeom', (event) => {
  //   if (highlightedItem) {
  //     highlightedItem.removeHighlight('pointerOverGeom', true)
  //     highlightedItem = null
  //   }
  // })
  renderer.getViewport().on('pointerDown', (event) => {
    if (event.intersectionData) {
      const geomItem = filterItem(event.intersectionData.geomItem)
      if (geomItem) {
        console.log(geomItem.getPath())

        const geom = event.intersectionData.geomItem.getParameter('Geometry').getValue()
        console.log(geom.getNumVertices(), event.intersectionData.geomItem.geomIndex)
        // const globalXfo = event.intersectionData.geomItem
        //   .getParameter("GlobalXfo")
        //   .getValue();
        // console.log(globalXfo.sc.toString());

        let item = event.intersectionData.geomItem
        while (item) {
          const globalXfo = item.getParameter('LocalXfo').getValue()
          console.log(item.getName(), globalXfo.sc.toString())
          item = item.getOwner()
        }
      }
    }
  })

  resourceLoader.on('progressIncremented', (event) => {
    const pct = document.getElementById('progress')
    pct.value = event.percent
    if (event.percent >= 100) {
      setTimeout(() => pct.classList.add('hidden'), 1000)
    }
  })

  renderer.getXRViewport().then((xrvp) => {
    fpsElement.style.bottom = '70px'

    const xrButton = document.getElementById('xr-button')
    xrButton.textContent = 'Launch VR'
    xrButton.classList.remove('hidden')

    xrvp.on('presentingChanged', (event) => {
      const { state } = event
      if (state) {
        xrButton.textContent = 'Exit VR'
      } else {
        xrButton.textContent = 'Launch VR'
      }
    })

    xrButton.addEventListener('click', function (event) {
      xrvp.togglePresenting()
    })

    document.addEventListener('keydown', (event) => {
      if (event.key == ' ') {
        xrvp.togglePresenting()
      }
    })
  })

  if (urlParams.has('profile')) {
    renderer.startContinuousDrawing()
  }

  // ////////////////////////////////////////////
  // Load the asset
  const loadCADfile = (zcad) => {
    const asset = new CADAsset()

    const context = new AssetLoadContext()
    // pass the camera in wth the AssetLoadContext so that
    // PMI classes can bind to it.
    context.camera = renderer.getViewport().getCamera()
    asset.load(zcad, context).then(() => {
      const materials = asset.getMaterialLibrary().getMaterials()
      materials.forEach((material) => {
        const BaseColor = material.getParameter('BaseColor')
        if (BaseColor) BaseColor.setValue(BaseColor.getValue().toGamma())
        const Reflectance = material.getParameter('Reflectance')
        if (Reflectance) Reflectance.setValue(0.01)
        const Metallic = material.getParameter('Metallic')
        if (Metallic) Metallic.setValue(0.9)
        const Roughness = material.getParameter('Roughness')
        if (Roughness) Roughness.setValue(0.9)
      })

      let count = 0
      asset.traverse((item) => {
        if (item instanceof GeomItem) {
          count++
        }
      })
      console.log('Done GeomItems:', count)
      asset.getGeometryLibrary().on('loaded', () => {
        let triangles = 0
        let lines = 0
        asset.traverse((item) => {
          if (item instanceof GeomItem) {
            const geom = item.getParameter('Geometry').getValue()
            if (geom instanceof LinesProxy) {
              lines += geom.__buffers.indices.length / 2
            }
            if (geom instanceof MeshProxy) {
              triangles += geom.__buffers.indices.length / 3
            }
          }
        })
        console.log('lines: ', lines, ' triangles: ', triangles)
      })
      renderer.frameAll()
    })
    scene.getRoot().addChild(asset)
  }

  if (urlParams.has('zcad')) {
    loadCADfile(urlParams.get('zcad'))
    const dropZone = document.getElementById('dropZone')
    if (dropZone) dropZone.hide()
  } else {
    const dropZone = document.getElementById('dropZone')
    dropZone.display((url, filename) => {
      loadCADfile(url)
    })
  }

  // const xfo = new Xfo();
  // xfo.ori.setFromEulerAngles(new EulerAngles(90 * (Math.PI / 180), 0, 0));
  // asset.getParameter("GlobalXfo").setValue(xfo);
}
