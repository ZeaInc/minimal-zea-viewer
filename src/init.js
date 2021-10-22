export default function init() {
  const {
    Color,
    Vec3,
    EulerAngles,
    Xfo,
    Scene,
    GLRenderer,
    CameraManipulator,
    EnvMap,
    resourceLoader,
    GeomItem,
    MeshProxy,
    LinesProxy,
    Registry,
  } = zeaEngine;
  const { CADAsset, CADBody } = zeaCad;

  const urlParams = new URLSearchParams(window.location.search);
  const scene = new Scene();
  scene.setupGrid(10.0, 10);

  const renderer = new GLRenderer(document.getElementById("canvas"), {
    debugGeomIds: false,
  });

  // //////////////////////////////////////////////////////
  // Temporary fix till the next point release comes out.
  // This code will be part of 3.11.2
  let lastResize = performance.now();
  let timoutId = 0;
  const handleResize = renderer.handleResize.bind(renderer);
  renderer.handleResize = (width, height) => {
    // Note: Rapid resize events would cause WebGL to render black.
    // There appeared nothing to indicate why we get black, but throttling
    // the resizing of our canvas and buffers seems to work.
    const now = performance.now();
    if (now - lastResize > 100) {
      lastResize = now;
      // If a delayed resize is scheduled, cancel it.
      if (timoutId) {
        clearTimeout(timoutId);
        timoutId = 0;
      }
      handleResize(width, height);
    } else {
      // Set a timer to see if we can delay this resize by a few ms.
      // If a resize happens in the meantime that succeeds, then skip this one.
      // This ensures that after a drag to resize, the final resize event
      // should always eventually apply.
      timoutId = setTimeout(() => {
        const now = performance.now();
        if (now - lastResize > 100) {
          lastResize = now;
          handleResize(width, height);
        }
      }, 100);
    }
  };
  // //////////////////////////////////////////////////////

  // renderer.solidAngleLimit = 0.0;
  renderer.setScene(scene);
  renderer
    .getViewport()
    .getCamera()
    .setPositionAndTarget(new Vec3(12, 12, 10), new Vec3(0, 0, 1.5));

  /*
      Change the Background color
  */
      const color = new Color('#7460e1') // this is equivalent to: new Color(116/255, 96/255, 225/255)
      // get the settings of the scene.
      const settings = scene.getSettings()
      // get the "BackgroundColor" parameter and set the value to our color.
      settings.getParameter('BackgroundColor').setValue(color)
          
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
  const fpsElement = document.getElementById("fps");
  fpsElement.renderer = renderer;

  // Setup TreeView Display
  const treeElement = document.getElementById("tree");
  treeElement.setTreeItem(scene.getRoot());

  let highlightedItem;
  const highlightColor = new Color("#F9CE03");
  highlightColor.a = 0.1;
  const filterItem = (item) => {
    while (item && !(item instanceof CADBody)) item = item.getOwner();
    return item;
  };
  renderer.getViewport().on("pointerOverGeom", (event) => {
    highlightedItem = filterItem(event.intersectionData.geomItem);
    highlightedItem.addHighlight("pointerOverGeom", highlightColor, true);
  });
  renderer.getViewport().on("pointerLeaveGeom", (event) => {
    highlightedItem.removeHighlight("pointerOverGeom", true);
    highlightedItem = null;
  });
  renderer.getViewport().on("pointerDown", (event) => {
    if (event.intersectionData) {
      const geomItem = filterItem(event.intersectionData.geomItem);
      console.log(geomItem.getPath());
    }
  });

  resourceLoader.on("progressIncremented", (event) => {
    const pct = document.getElementById("progress");
    pct.value = event.percent;
    if (event.percent >= 100) {
      setTimeout(() => pct.classList.add("hidden"), 1000);
    }
  });

  renderer.getXRViewport().then((xrvp) => {
    fpsElement.style.bottom = "70px";

    const xrButton = document.getElementById("xr-button");
    xrButton.textContent = "Launch VR";
    xrButton.classList.remove("hidden");

    xrvp.on("presentingChanged", (event) => {
      const { state } = event;
      if (state) {
        xrButton.textContent = "Exit VR";
      } else {
        xrButton.textContent = "Launch VR";
      }
    });

    xrButton.addEventListener("click", function (event) {
      xrvp.togglePresenting();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key == " ") {
        xrvp.togglePresenting();
      }
    });
  });

  if (urlParams.has("profile")) {
    renderer.startContinuousDrawing();
  }

  // ////////////////////////////////////////////
  // Load the asset
  function loadcadasset(zcad, framecamera) {
    const asset = new CADAsset();
    // const zcad = urlParams.has("zcad")
    //   ? urlParams.get("zcad")
    //   : "../data/HC_SRO4.zcad";
    if (zcad) {
      asset.load(zcad).then(() => {
        let count = 0;
        asset.traverse((item) => {
          if (item instanceof GeomItem) {
            count++;
          }
        });
        console.log("Done GeomItems:", count);
        asset.getGeometryLibrary().on("loaded", () => {
          let triangles = 0;
          let lines = 0;
          asset.traverse((item) => {
            if (item instanceof GeomItem) {
              const geom = item.getParameter("Geometry").getValue();
              if (geom instanceof LinesProxy) {
                lines += geom.__buffers.indices.length / 2;
              }
              if (geom instanceof MeshProxy) {
                triangles += geom.__buffers.indices.length / 3;
              }
            }
          });
          console.log("lines: ", lines, " triangles: ", triangles);
        });
        if (framecamera)
          renderer.getViewport().frameView([asset]);
        //renderer.frameAll();
      });
    }

    scene.getRoot().addChild(asset);

    const xfo = new Xfo();
    // xfo.ori.setFromEulerAngles(new EulerAngles(90 * (Math.PI / 180), 0, 0));
    xfo.ori.setFromEulerAngles(new EulerAngles(180 * (Math.PI / 180), 90 * (Math.PI / 180), 0 * (Math.PI / 180))); //for PressRink
    asset.getParameter("GlobalXfo").setValue(xfo);
  }

  //load default sample part
  //loadcadasset("./data/HC_SRO4.zcad", true);

  //load default sample part
  loadcadasset("./data/PressRink.zcad", true);

  //uncomment to load large automobile assembly
  // loadcadasset("./data/01 dipan/01 dipan.zcad", false);
  // loadcadasset("./data/02 dongli/02 dongli.zcad", false);
  // loadcadasset("./data/03 cheshen/03 cheshen.zcad", true);
  // loadcadasset("./data/04 fujian/04 fujian.zcad", false);
  // loadcadasset("./data/05 dianqi/05 dianqi.zcad", false);

}
