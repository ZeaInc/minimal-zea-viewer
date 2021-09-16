export default function init() {
  const {
    Color,
    Vec3,
    EulerAngles,
    Xfo,
    Scene,
    GLRenderer,
    EnvMap,
    resourceLoader,
    GeomItem,
    MeshProxy,
    LinesProxy,
  } = zeaEngine;
  const { CADAsset, CADBody } = zeaCad;

  const urlParams = new URLSearchParams(window.location.search);
  const scene = new Scene();
  scene.setupGrid(10.0, 10);

  const renderer = new GLRenderer(document.getElementById("canvas"), {
    debugGeomIds: false,
  });
  // renderer.solidAngleLimit = 0.0;
  renderer.setScene(scene);
  renderer
    .getViewport()
    .getCamera()
    .setPositionAndTarget(new Vec3(12, 12, 10), new Vec3(0, 0, 1.5));

  const envMap = new EnvMap();
  envMap.load("../data/StudioG.zenv");
  scene.setEnvMap(envMap);

  const asset = new CADAsset();
  const zcad = urlParams.has("zcad")
    ? urlParams.get("zcad")
    : "../data/HC_SRO4.zcad";
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
      renderer.frameAll();
    });
  }

  scene.getRoot().addChild(asset);

  const xfo = new Xfo();
  xfo.ori.setFromEulerAngles(new EulerAngles(90 * (Math.PI / 180), 0, 0));
  asset.getParameter("GlobalXfo").setValue(xfo);

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
}
