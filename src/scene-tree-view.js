const { Color, TreeItem } = window.zeaEngine;

const highlightColor = new Color("#F9CE03");
highlightColor.a = 0.1;
/**
 * Tree item view.
 *
 */
class TreeItemView extends HTMLElement {
  /**
   * Constructor.
   *
   */
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });

    // Add component CSS
    const styleTag = document.createElement("style");
    styleTag.appendChild(document.createTextNode(TreeItemView.css));
    shadowRoot.appendChild(styleTag);

    // Create container tags
    this.itemContainer = document.createElement("div");

    this.itemHeader = document.createElement("div");
    this.itemHeader.className = "TreeNodeHeader";
    this.itemContainer.appendChild(this.itemHeader);

    this.itemChildren = document.createElement("div");
    this.itemChildren.className = "TreeNodesList";
    this.itemContainer.appendChild(this.itemChildren);

    // Item expand button
    this.expandBtn = document.createElement("button");
    this.expandBtn.className = "TreeNodesListItem__ToggleExpanded";
    this.itemHeader.appendChild(this.expandBtn);

    this.expanded = false;
    this.childrenAlreadyCreated = false;

    this.expandBtn.addEventListener("click", () => {
      if (this.treeItem.getNumChildren() > 0) {
        this.expanded ? this.collapse() : this.expand();
      }
    });

    // Title element
    this.titleElement = document.createElement("span");
    this.titleElement.className = "TreeNodesListItem__Title";
    this.titleElement.addEventListener("click", (e) => {
      if (!this.appData || !this.appData.selectionManager) {
        if (!this.treeItem.getSelected()) {
          this.treeItem.setSelected(true);
          this.treeItem.addHighlight("selected", highlightColor, true);
        } else {
          this.treeItem.setSelected(false);
          this.treeItem.removeHighlight("selected", true);
        }
        return;
      }
      if (this.appData.selectionManager.pickingModeActive()) {
        this.appData.selectionManager.pick(this.treeItem);
        return;
      }
      this.appData.selectionManager.toggleItemSelection(
        this.treeItem,
        !e.ctrlKey
      );
    });

    this.itemHeader.appendChild(this.titleElement);

    //
    shadowRoot.appendChild(this.itemContainer);
  }

  /**
   * Set tree item.
   * @param {object} treeItem Tree item.
   * @param {object} appData App data.
   */
  setTreeItem(treeItem, appData) {
    this.treeItem = treeItem;

    this.appData = appData;

    // Name
    this.titleElement.textContent = treeItem.getName();
    const updateName = () => {
      this.titleElement.textContent = treeItem.getName();
    };
    this.treeItem.on("nameChanged", updateName);

    // Selection
    this.updateSelectedId = this.treeItem.on(
      "selectedChanged",
      this.updateSelected.bind(this)
    );
    this.updateSelected();

    if (treeItem instanceof TreeItem) {
      // Visiblity

      // Visibility Checkbox
      this.toggleVisibilityBtn = document.createElement("input");
      this.toggleVisibilityBtn.type = "checkbox";

      this.itemHeader.insertBefore(this.toggleVisibilityBtn, this.titleElement);

      this.toggleVisibilityBtn.addEventListener("click", () => {
        const visibleParam = this.treeItem.getParameter("Visible");
        if (this.appData && this.appData.undoRedoManager) {
          const change = new ParameterValueChange(
            visibleParam,
            !visibleParam.getValue()
          );
          this.appData.undoRedoManager.addChange(change);
        } else {
          visibleParam.setValue(!visibleParam.getValue());
        }
      });
      this.treeItem.on("visibilityChanged", this.updateVisibility.bind(this));
      this.updateVisibility();

      // Highlights
      this.treeItem.on("highlightChanged", this.updateHighlight.bind(this));
      this.updateHighlight();

      if (this.treeItem.getChildren().length) {
        this.collapse();
      }

      this.childAddedId = this.treeItem.on(
        "childAdded",
        this.childAdded.bind(this)
      );
      this.childRemovedId = this.treeItem.on(
        "childRemoved",
        this.childRemoved.bind(this)
      );
    }
  }

  /**
   * Update visibility.
   *
   */
  updateVisibility() {
    const visible = this.treeItem.isVisible();
    visible
      ? this.itemContainer.classList.remove("TreeNodesListItem--isHidden")
      : this.itemContainer.classList.add("TreeNodesListItem--isHidden");

    if (visible) {
      this.toggleVisibilityBtn.checked = true;
    } else {
      this.toggleVisibilityBtn.checked = false;
    }
  }

  /**
   * Update selected.
   *
   */
  updateSelected() {
    const selected = this.treeItem.getSelected();
    if (selected)
      this.itemContainer.classList.add("TreeNodesListItem--isSelected");
    else this.itemContainer.classList.remove("TreeNodesListItem--isSelected");
  }

  /**
   * Update highlight.
   */
  updateHighlight() {
    const hilighted = this.treeItem.isHighlighted();
    if (hilighted)
      this.itemContainer.classList.add("TreeNodesListItem--isHighlighted");
    else
      this.itemContainer.classList.remove("TreeNodesListItem--isHighlighted");
    if (hilighted) {
      const highlightColor = this.treeItem.getHighlight();
      const bgColor = highlightColor.lerp(new Color(0.75, 0.75, 0.75, 0), 0.5);
      this.titleElement.style.setProperty(
        "border-color",
        highlightColor.toHex()
      );
      this.titleElement.style.setProperty("background-color", bgColor.toHex());
    } else {
      this.titleElement.style.removeProperty("border-color");
      this.titleElement.style.removeProperty("background-color");
    }
  }

  /**
   * The expand method.
   */
  expand() {
    this.expanded = true;
    this.itemChildren.classList.remove("TreeNodesList--collapsed");
    this.expandBtn.innerHTML =
      '<i class="material-icons md-24">arrow_drop_down</i>';

    if (!this.childrenAlreadyCreated) {
      const children = this.treeItem.getChildren();
      children.forEach((childItem, index) => {
        if (childItem instanceof TreeItem && childItem.getSelectable()) {
          this.addChild(childItem, index);
        }
      });
      this.childrenAlreadyCreated = true;
    }
  }

  /**
   * The collapse method.
   */
  collapse() {
    this.itemChildren.classList.add("TreeNodesList--collapsed");
    this.expandBtn.innerHTML =
      '<i class="material-icons md-24">arrow_right</i>';
    this.expanded = false;
  }

  /**
   * The addChild method.
   * @param {any} treeItem - The treeItem param.
   * @param {number} index - The expanded param.
   */
  addChild(treeItem, index) {
    if (this.expanded) {
      const childTreeItem = document.createElement("tree-item-view");
      childTreeItem.setTreeItem(treeItem, this.appData);

      if (index == this.itemChildren.childElementCount) {
        this.itemChildren.appendChild(childTreeItem);
      } else {
        this.itemChildren.insertBefore(
          childTreeItem,
          this.itemChildren.children[index]
        );
      }
    } else {
      this.collapse();
    }
  }

  childAdded(childItem, index) {
    // if (!childItem.testFlag(ItemFlags.INVISIBLE))
    this.addChild(childItem, index);
  }

  childRemoved(childItem, index) {
    if (this.expanded) {
      this.itemChildren.children[index].destroy();
      this.itemChildren.removeChild(this.itemChildren.children[index]);
    }
  }

  getChild(index) {
    return this.itemChildren.children[index];
  }

  /**
   * The destroy method.
   */
  destroy() {
    this.treeItem.selectedChanged.disconnectId(this.updateSelectedId);
    if (this.treeItem instanceof TreeItem) {
      this.treeItem.highlightChanged.disconnectId(this.updateHighlightId);
      this.treeItem.visibilityChanged.disconnectId(this.updateVisibilityId);
      this.treeItem.childAdded.disconnectId(this.childAddedId);
      this.treeItem.childRemoved.disconnectId(this.childRemovedId);
    }
    // this.parentDomElement.removeChild(this.li);
  }
}

TreeItemView.css = `
  /* tree-view.css */

  ////
  /// From https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined

  /* fallback */
  @font-face {
    font-family: 'Material Icons';
    font-style: normal;
    font-weight: 400;
    src: url(https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2) format('woff2');
  }
  /* fallback */
  @font-face {
    font-family: 'Material Icons Outlined';
    font-style: normal;
    font-weight: 400;
    src: url(https://fonts.gstatic.com/s/materialiconsoutlined/v14/gok-H7zzDkdnRel8-DQ6KAXJ69wP1tGnf4ZGhUce.woff2) format('woff2');
  }

  .material-icons {
    font-family: 'Material Icons';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
  }

  .material-icons-outlined {
    font-family: 'Material Icons Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 24px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: 'liga';
    -webkit-font-smoothing: antialiased;
    background-color: #fff0;
    color: azure;
  }
  .TreeNodesList {
    border-left: 1px dotted;
    list-style-type: none;
    padding: 0 4px 0 4px;
    margin: 0 0 0 2px;
  }

  .TreeNodesList--collapsed {
    display: none;
  }

  .TreeNodesList--root {
    border: none;
    margin: 0;
    padding: 0;
    width: max-content;
  }

  .TreeNodesListItem{
    display: flex;
  }

  .TreeNodesListItem__ToggleExpanded {
    border: none;
    height: 24px;
    width: 20px;
    padding: 0;
    background-color: #0000;
    color: azure;
    outline: none;
  }

  .TreeNodesListItem::before {
    border-bottom: 1px dotted;
    content: '';
    display: inline-block;
    left: -15px;
    position: relative;
    top: -5px;
    width: 10px;
  }

  .TreeNodesListItem__Toggle:focus {
    outline: none;
  }

  .TreeNodeHeader {
    display: flex;
    margin: 0 auto;
    color: azure;
  }

  .TreeNodesListItem__Title {
    cursor: default;
    padding: 2px 4px;
    border-radius: 5px;
    // color: azure;
  }

  .TreeNodesListItem__Title:hover {
    // background-color: #e1f5fe;
    // color: azure;
  }
  .TreeNodesListItem__Hover {
    background-color: #e1f5fe;
  }

  .TreeNodesListItem__Dragging {
    background-color: #e1f5fe;
  }

  .TreeNodesListItem--isSelected > .TreeNodeHeader > .TreeNodesListItem__Title {
    // background-color: #76d2bb;
    color: #3B3B3B;
  }

  .TreeNodesListItem--isHidden > .TreeNodeHeader >  .TreeNodesListItem__Title {
    color: #9e9e9e;
  }

  .TreeNodesListItem--isHighlighted > .TreeNodeHeader >  .TreeNodesListItem__Title {
    // border-style: solid;
    // border-width: thin;
  }

  /* Rules for sizing the icon. */
  .material-icons-outlined.md-15,
  .material-icons.md-15 {
    font-size: 15px;
  }
  .material-icons.md-18 {
    font-size: 18px;
  }
  .material-icons.md-24 {
    font-size: 24px;
  }
  .material-icons.md-36 {
    font-size: 36px;
  }
  .material-icons.md-48 {
    font-size: 48px;
  }

  /* Rules for using icons as black on a light background. */
  .material-icons.md-dark {
    color: rgba(0, 0, 0, 0.54);
  }
  .material-icons.md-dark.md-inactive {
    color: rgba(0, 0, 0, 0.26);
  }

  /* Rules for using icons as white on a dark background. */
  .material-icons.md-light {
    color: rgba(255, 255, 255, 1);
  }
  .material-icons.md-light.md-inactive {
    color: rgba(255, 255, 255, 0.3);
  }

  `;

customElements.define("tree-item-view", TreeItemView);

/**
 * Scene tree view.
 *
 */
class SceneTreeView extends HTMLElement {
  /**
   * Constructor.
   *
   */
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });

    // Add component CSS
    const styleTag = document.createElement("style");
    styleTag.appendChild(
      document.createTextNode(`
    .TreeView {
      overflow:auto;
      overflow-x:hidden;
    }`)
    );
    shadowRoot.appendChild(styleTag);

    // Create container tags
    this.treeContainer = document.createElement("div");
    this.treeContainer.className = "TreeView";
    shadowRoot.appendChild(this.treeContainer);

    // Init root tree item
    this.treeItemView = document.createElement("tree-item-view");
    this.treeContainer.appendChild(this.treeItemView);

    //////////////////////
    // Force loading of @font-face so the main page desn't have to.
    // this is to work around a limitation in Chrome, where @font-face
    // Are not loaded in the shadow dom and must be loaded in the page.
    // See here: https://github.com/mdn/interactive-examples/issues/887

    const fontFaceSheet1 = new CSSStyleSheet();
    fontFaceSheet1.replaceSync(`@font-face {
      font-family: "Material Icons";
      font-style: normal;
      font-weight: 400;
      src: url('https://fonts.gstatic.com/s/materialicons/v48/flUhRq6tzZclQEJ-Vdg-IuiaDsNc.woff2') format('woff');
    }`);

    const fontFaceSheet2 = new CSSStyleSheet();
    fontFaceSheet2.replaceSync(`@font-face {
      font-family: "Material Icons Outlined";
      font-style: normal;
      font-weight: 400;
      src: url('https://fonts.gstatic.com/s/materialiconsoutlined/v14/gok-H7zzDkdnRel8-DQ6KAXJ69wP1tGnf4ZGhUce.woff2') format('woff');
    }`);

    document.adoptedStyleSheets = [
      ...document.adoptedStyleSheets,
      fontFaceSheet1,
      fontFaceSheet2,
    ];

    this.__onKeyDown = this.__onKeyDown.bind(this);
    this.__onMouseEnter = this.__onMouseEnter.bind(this);
    this.__onMouseLeave = this.__onMouseLeave.bind(this);
    document.addEventListener("keydown", this.__onKeyDown);
    this.addEventListener("mouseenter", this.__onMouseEnter);
    this.addEventListener("mouseleave", this.__onMouseLeave);
  }

  /**
   * Set tree item.
   * @param {object} treeItem Tree item.
   * @param {object} appData App data.
   */
  setTreeItem(treeItem, appData) {
    this.rootTreeItem = treeItem;
    this.appData = appData;
    this.treeItemView.setTreeItem(treeItem, appData);
  }

  __onMouseEnter(event) {
    this.mouseOver = true;
  }

  __onMouseLeave(event) {
    this.mouseOver = false;
  }

  __onKeyDown(event) {
    if (!this.mouseOver || !this.appData) return;
    const { selectionManager } = this.appData;
    if (!selectionManager) return;
    if (this.mouseOver && event.key == "f") {
      const selectedItems = selectionManager.getSelection();
      this.expandSelection(selectedItems, true);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key == "ArrowLeft") {
      const selectedItems = selectionManager.getSelection();
      const newSelection = new Set();
      Array.from(selectedItems).forEach((item) => {
        newSelection.add(item.getOwner());
      });
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection);
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key == "ArrowRight") {
      const selectedItems = selectionManager.getSelection();
      const newSelection = new Set();
      Array.from(selectedItems).forEach((item) => {
        if (item instanceof TreeItem && item.getNumChildren() > 0)
          newSelection.add(item.getChild(0));
      });
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection);
        this.expandSelection(newSelection, true);
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key == "ArrowUp") {
      const selectedItems = selectionManager.getSelection();
      const newSelection = new Set();
      Array.from(selectedItems).forEach((item) => {
        const index = item.getOwner().getChildIndex(item);
        if (index == 0) newSelection.add(item.getOwner());
        else {
          newSelection.add(item.getOwner().getChild(index - 1));
        }
      });
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection);
        this.expandSelection(newSelection);
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key == "ArrowDown") {
      const selectedItems = selectionManager.getSelection();
      const newSelection = new Set();
      Array.from(selectedItems).forEach((item) => {
        const index = item.getOwner().getChildIndex(item);
        if (index < item.getOwner().getNumChildren() - 1)
          newSelection.add(item.getOwner().getChild(index + 1));
        else {
          const indexinOwner = item.getOwner().getChildIndex(item);
          if (item.getOwner().getNumChildren() > indexinOwner + 1)
            newSelection.add(item.getOwner().getChild(indexinOwner + 1));
        }
      });
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection);
        this.expandSelection(newSelection, true);
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }
  /**
   * The expandSelection method.
   * @param {Map} items - The items we wish to expand to show.
   */
  expandSelection(items, scrollToView = true) {
    Array.from(items).forEach((item) => {
      const path = [];
      while (true) {
        path.splice(0, 0, item);
        if (item == this.rootTreeItem) break;
        item = item.getOwner();
      }
      let treeViewItem = this.treeItemView;
      path.forEach((item, index) => {
        if (index < path.length - 1) {
          if (!treeViewItem.expanded) treeViewItem.expand();
          const childIndex = item.getChildIndex(path[index + 1]);
          treeViewItem = treeViewItem.getChild(childIndex);
        }
      });
      // causes the element to be always at the top of the view.
      if (scrollToView && treeViewItem)
        treeViewItem.titleElement.scrollIntoView({
          behavior: "auto",
          block: "nearest",
          inline: "nearest",
        });
    });
  }
}

customElements.define("scene-tree-view", SceneTreeView);

export default SceneTreeView;
