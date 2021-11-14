/* eslint-disable require-jsdoc */
export default function init() {
  const {
    Color,
    Vec3,
    Scene,
    GLRenderer,
    CameraManipulator,
    EnvMap,
    resourceLoader,
    AssetLoadContext,
    GeomItem,
    ObjAsset,
    Lines,
    LinesProxy,
    Mesh,
    MeshProxy,
  } = zeaEngine
  const { CADAsset, CADBody } = zeaCad

  const urlParams = new URLSearchParams(window.location.search)
  const scene = new Scene()
  scene.setupGrid(10.0, 10)

  const renderer = new GLRenderer(document.getElementById('canvas'), {
    debugGeomIds: false,
    /* Enable frustum culling which speeds up rendering on large complex scenes */
    enableFrustumCulling: true,
  })

  // renderer.solidAngleLimit = 0.0;
  renderer.setScene(scene)
  renderer.getViewport().getCamera().setPositionAndTarget(new Vec3(12, 12, 10), new Vec3(0, 0, 1.5))

  /*
    Change Camera Manipulation mode
  */
  renderer
    .getViewport()
    .getManipulator()
    .setDefaultManipulationMode(CameraManipulator.MANIPULATION_MODES.turntable);

  const envMap = new EnvMap();
  envMap.load("../data/StudioG.zenv");
  scene.setEnvMap(envMap);

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
  renderer.getViewport().on('pointerDown', (event) => {
    if (event.intersectionData) {
      const geomItem = filterItem(event.intersectionData.geomItem)
      if (geomItem) {
        console.log(geomItem.getPath())

        const geom = event.intersectionData.geomItem.getParameter('Geometry').getValue()
        console.log(geom.getNumVertices(), event.intersectionData.geomItem.geomIndex)
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

  document.addEventListener('keydown', (event) => {
    if (event.key == 'f') {
      renderer.frameAll()
      event.stopPropagation()
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
  const calcSceneComplexity = () => {
    let geomItems = 0
    let triangles = 0
    let lines = 0
    scene.getRoot().traverse((item) => {
      geomItems++
      if (item instanceof GeomItem) {
        const geom = item.getParameter('Geometry').getValue()
        if (geom instanceof Lines) {
          lines += geom.getNumSegments()
        } else if (geom instanceof LinesProxy) {
          lines += geom.getNumLineSegments()
        } else if (geom instanceof Mesh) {
          triangles += geom.computeNumTriangles()
        } else if (geom instanceof MeshProxy) {
          triangles += geom.__buffers.indices ? geom.getNumTriangles() : geom.__buffers.numVertices / 3
        }
      }
    })
    console.log('geomItems:' + geomItems + ' lines: ' + lines + ' triangles:', triangles)
  }

const loadCADAsset = (zcad, filename, framecamera) => {
    const asset = new CADAsset(filename)

    const context = new AssetLoadContext()
    // pass the camera in wth the AssetLoadContext so that
    // PMI classes can bind to it.
    context.camera = renderer.getViewport().getCamera()
    asset.load(zcad, context).then(() => {
      renderer.frameAll()
    })
    asset.getGeometryLibrary().on('loaded', () => {
      calcSceneComplexity()
    })
    scene.getRoot().addChild(asset)

    // const xfo = new Xfo();
    // // xfo.ori.setFromEulerAngles(new EulerAngles(90 * (Math.PI / 180), 0, 0));
    // xfo.ori.setFromEulerAngles(new EulerAngles(180 * (Math.PI / 180), 90 * (Math.PI / 180), 0 * (Math.PI / 180))); //for PressRink
    // asset.getParameter("GlobalXfo").setValue(xfo);
  }

  const loadGLTFAsset = (url, filename) => {
    const { GLTFAsset } = gltfLoader
    const asset = new GLTFAsset(filename)
    asset.load(url, filename).then(() => {
      calcSceneComplexity()
      renderer.frameAll()
    })
    scene.getRoot().addChild(asset)
    return asset
  }

  const loadOBJAsset = (url, filename) => {
    const asset = new ObjAsset(filename)
    asset.load(url).then(() => {
      calcSceneComplexity()
      renderer.frameAll()
    })
    scene.getRoot().addChild(asset)
    return asset
  }

  const loadAsset = (url, filename) => {
    if (filename.endsWith('zcad')) {
      return loadCADAsset(url, filename)
    } else if (filename.endsWith('gltf') || filename.endsWith('glb')) {
      return loadGLTFAsset(url, filename)
    } else if (filename.endsWith('obj')) {
      return loadOBJAsset(url, filename)
    } else {
      throw new Error('Unsupported file type:' + filename)
    }
  }

  if (urlParams.has('zcad')) {
    loadCADfile(urlParams.get('zcad'))
    const dropZone = document.getElementById('dropZone')
    if (dropZone) dropZone.hide()
  } else if (urlParams.has('gltf')) {
    loadGLTFAsset(urlParams.get('gltf'))
    const dropZone = document.getElementById('dropZone')
    if (dropZone) dropZone.hide()
  } else if (urlParams.has('obj')) {
    loadOBJAsset(urlParams.get('obj'))
    const dropZone = document.getElementById('dropZone')
    if (dropZone) dropZone.hide()
  } else {
    const dropZone = document.getElementById('dropZone')
    dropZone.display((url, filename) => {
      loadAsset(url, filename)
    })
  }

  //load default sample part
  //loadCADAsset("HC_SRO4.zcad", "./data/HC_SRO4.zcad", true);

  //load default sample part
  //loadCADAsset("PressRink.zcad", "./data/PressRink.zcad", true);

  //uncomment to load large automobile assembly
  loadCADAsset("01 dipan.zcad", "./data/01 dipan/01 dipan.zcad", false);
  loadCADAsset("02 dongli.zcad", "./data/02 dongli/02 dongli.zcad", false);
  loadCADAsset("03 cheshen.zcad", "./data/03 cheshen/03 cheshen.zcad", true);
  loadCADAsset("04 fujian.zcad", "./data/04 fujian/04 fujian.zcad", false);
  loadCADAsset("05 dianqi.zcad", "./data/05 dianqi/05 dianqi.zcad", false);
}
