const { Color, TreeItem, InstanceItem } = window.zeaEngine
const { CADBody, PMIItem } = zeaCad

// ////////////////////////////////////////
// Provide a simple debug mode to enable debugging the tree view.
let displayTreeComplexity = false
const colorStart = new Color(0, 0, 0)
const colorEnd = new Color(1, 0, 0)
const treeItemWeights = {}
let rootTreeItemView
let totalWeight = 0
let recalcRequested = 0
const updateTreeView = () => {
  if (recalcRequested == 0) {
    recalcRequested = setTimeout(() => {
      rootTreeItemView.displayTreeWeight()
      recalcRequested = 0
    }, 100)
  }
}
const propagateWeightUp = (treeItem, delta) => {
  treeItemWeights[treeItem.getId()] += delta
  if (treeItem.getOwner()) propagateWeightUp(treeItem.getOwner(), delta)
}
const calcTreeWeight = (treeItem) => {
  let weight = 1 // self
  const children = treeItem.getChildren()
  children.forEach((childItem, index) => {
    weight += calcTreeWeight(childItem)
  })
  treeItemWeights[treeItem.getId()] = weight

  treeItem.on('childAdded', (event) => {
    const { childItem } = event
    const childWeight = calcTreeWeight(childItem)
    totalWeight += childWeight
    propagateWeightUp(treeItem, childWeight)

    updateTreeView()
  })
  treeItem.on('childRemoved', (event) => {
    const { childItem } = event
    const childWeight = -calcTreeWeight(childItem)
    totalWeight += childWeight
    propagateWeightUp(treeItem, childWeight)

    updateTreeView()
  })
  return weight
}

// ////////////////////////////////////////

const highlightColor = new Color('#F9CE03')
highlightColor.a = 0.1

let selectedItem
const setSelection = (treeItem, state, appData) => {
  if (state) {
    if (selectedItem) {
      selectedItem.setSelected(false)
      selectedItem.removeHighlight('selected', true)
    }
    selectedItem = treeItem
    selectedItem.setSelected(true)
    selectedItem.addHighlight('selected', highlightColor, true)
  } else {
    if (selectedItem) {
      selectedItem.setSelected(false)
      selectedItem.removeHighlight('selected', true)
      selectedItem = null
    }
  }
}

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
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    // Add component CSS
    const styleTag = document.createElement('style')
    styleTag.appendChild(document.createTextNode(TreeItemView.css))
    shadowRoot.appendChild(styleTag)

    // Create container tags
    this.itemContainer = document.createElement('div')
    this.itemContainer.className = 'ItemContainer'

    this.itemHeader = document.createElement('div')
    this.itemHeader.className = 'TreeNodeHeader'
    this.itemContainer.appendChild(this.itemHeader)

    this.itemChildren = document.createElement('div')
    this.itemChildren.className = 'TreeNodesList'
    this.itemContainer.appendChild(this.itemChildren)

    // Item expand button

    {
      this.expandBtn = document.createElement('button')
      this.expandBtn.className = 'TreeNodesListItem__ToggleExpanded'
      this.itemHeader.appendChild(this.expandBtn)

      this.expanded = false
      this.childrenAlreadyCreated = false

      this.expandBtn.addEventListener('click', () => {
        const numChildren = this.countChildren()
        if (numChildren > 0) {
          this.expanded ? this.collapse() : this.expand()
        }
      })
    }

    // Title element
    this.titleElement = document.createElement('div')
    this.titleElement.className = 'TreeItemName'
    this.titleElement.addEventListener('click', (e) => {
      if (!this.appData || !this.appData.selectionManager) {
        if (!this.treeItem.isSelected()) {
          setSelection(this.treeItem, true, this.appData)
        } else {
          setSelection(this.treeItem, false, this.appData)
        }
        return
      }
      if (this.appData.selectionManager.pickingModeActive()) {
        this.appData.selectionManager.pick(this.treeItem)
        return
      }
      this.appData.selectionManager.toggleItemSelection(this.treeItem, !e.ctrlKey)
    })

    this.itemHeader.appendChild(this.titleElement)

    // Tooltip
    this.tooltip = document.createElement('SPAN')
    this.tooltip.className = 'tooltiptext'
    this.itemHeader.appendChild(this.tooltip)

    //
    shadowRoot.appendChild(this.itemContainer)
  }

  /**
   * Set tree item.
   * @param {object} treeItem Tree item.
   * @param {object} appData App data.
   */
  setTreeItem(treeItem, appData) {
    this.treeItem = treeItem

    let name
    const displayNameParam = this.treeItem.getParameter('DisplayName')
    if (displayNameParam) {
      name = displayNameParam.getValue()
    } else name = this.treeItem.getName()

    if (this.treeItem instanceof InstanceItem && this.treeItem.getNumChildren() == 1) {
      const referenceItem = this.treeItem.getChild(0)
      if (name == '') {
        const displayNameParam = referenceItem.getParameter('DisplayName')
        if (displayNameParam) {
          name = displayNameParam.getValue()
        } else name = referenceItem.getName()
      }

      this.titleElement.textContent = name

      this.tooltip.textContent = `Instance of (${referenceItem.getClassName()})`
    } else {
      this.tooltip.textContent = `(${this.treeItem.getClassName()})`
      this.titleElement.textContent = name
    }

    // Name
    const updateName = () => {
      this.titleElement.textContent = treeItem.getName()
    }
    this.treeItem.on('nameChanged', updateName)

    this.appData = appData

    // Selection
    this.updateSelectedId = this.treeItem.on('selectedChanged', this.updateSelected.bind(this))
    this.updateSelected()

    if (treeItem instanceof TreeItem) {
      // Visiblity

      // Visibility Checkbox
      this.toggleVisibilityBtn = document.createElement('input')
      this.toggleVisibilityBtn.type = 'checkbox'
      this.toggleVisibilityBtn.className = 'TreeNodesListItem__ToggleVisibility'

      this.itemHeader.insertBefore(this.toggleVisibilityBtn, this.titleElement)

      this.toggleVisibilityBtn.addEventListener('click', () => {
        const visibleParam = this.treeItem.getParameter('Visible')
        if (this.appData && this.appData.undoRedoManager) {
          const change = new ParameterValueChange(visibleParam, !visibleParam.getValue())
          this.appData.undoRedoManager.addChange(change)
        } else {
          visibleParam.setValue(!visibleParam.getValue())
        }
      })
      this.treeItem.on('visibilityChanged', this.updateVisibility.bind(this))
      this.updateVisibility()

      // Highlights
      this.treeItem.on('highlightChanged', this.updateHighlight.bind(this))
      this.updateHighlight()

      const numChildren = this.countChildren()
      if (numChildren > 0) {
        this.collapse()
      }

      this.childAddedId = this.treeItem.on('childAdded', this.childAdded.bind(this))
      this.childRemovedId = this.treeItem.on('childRemoved', this.childRemoved.bind(this))
    }

    if (displayTreeComplexity) {
      this.displayTreeWeight()
    }
  }

  /**
   * Update visibility.
   *
   */
  updateVisibility() {
    const visible = this.treeItem.isVisible()
    visible
      ? this.itemContainer.classList.remove('TreeNodesListItem--isHidden')
      : this.itemContainer.classList.add('TreeNodesListItem--isHidden')

    if (visible) {
      this.toggleVisibilityBtn.checked = true
    } else {
      this.toggleVisibilityBtn.checked = false
    }
  }

  /**
   * Update selected.
   *
   */
  updateSelected() {
    const selected = this.treeItem.isSelected()
    if (selected) this.itemContainer.classList.add('TreeNodesListItem--isSelected')
    else this.itemContainer.classList.remove('TreeNodesListItem--isSelected')
  }

  /**
   * Update highlight.
   */
  updateHighlight() {
    const hilighted = this.treeItem.isHighlighted()
    if (hilighted) this.itemContainer.classList.add('TreeNodesListItem--isHighlighted')
    else this.itemContainer.classList.remove('TreeNodesListItem--isHighlighted')
    if (hilighted) {
      const highlightColor = this.treeItem.getHighlight()
      const bgColor = highlightColor.lerp(new Color(0.75, 0.75, 0.75, 0), 0.5)
      this.titleElement.style.setProperty('border-color', highlightColor.toHex())
      this.titleElement.style.setProperty('background-color', bgColor.toHex())
    } else {
      this.titleElement.style.removeProperty('border-color')
      this.titleElement.style.removeProperty('background-color')
    }
  }

  /**
   * Display the weight of this tree item against the weight of the entire tree.
   */
  displayTreeWeight() {
    const weight = treeItemWeights[this.treeItem.getId()]

    // Note: use a power curve so that the colors don't go black too fast.
    const weightFract = Math.pow(weight / totalWeight, 0.25)
    // console.log(weight, totalWeight, weightFract)
    const bgColor = colorStart.lerp(colorEnd, weightFract)
    this.titleElement.style.setProperty('background-color', bgColor.toHex())
    this.tooltip.textContent = `(${weight}/${totalWeight})`

    const children = this.treeItem.getChildren()
    children.forEach((childItem, index) => {
      const childTreeItemView = this.getChildByTreeItem(childItem)
      if (childTreeItemView) childTreeItemView.displayTreeWeight()
    })
  }

  /**
   * Count the number of selectable children.
   * @return {number} the number of selectable children.
   */
  countChildren() {
    const children = this.treeItem.getChildren()
    let count = 0
    children.forEach((childItem, index) => {
      if (childItem instanceof TreeItem && childItem.isSelectable()) {
        count++
      }
    })
    return count
  }

  /**
   * The expand method.
   */
  expand() {
    this.expanded = true
    this.itemChildren.classList.remove('TreeNodesList--collapsed')
    this.expandBtn.innerHTML = '-'

    if (!this.childrenAlreadyCreated) {
      let children
      if (this.treeItem instanceof InstanceItem && this.treeItem.getNumChildren() == 1) {
        children = this.treeItem.getChild(0).getChildren()
      } else {
        children = this.treeItem.getChildren()
      }

      children.forEach((childItem, index) => {
        if (childItem instanceof TreeItem && childItem.isSelectable()) {
          this.addChild(childItem, index)
        }
      })
      this.childrenAlreadyCreated = true
    }
  }

  /**
   * The collapse method.
   */
  collapse() {
    this.itemChildren.classList.add('TreeNodesList--collapsed')
    this.expandBtn.innerHTML = '+'
    this.expanded = false
  }

  /**
   * The addChild method.
   * @param {any} treeItem - The treeItem param.
   * @param {number} index - The expanded param.
   */
  addChild(treeItem, index) {
    if (this.expanded) {
      const childTreeItem = document.createElement('tree-item-view')
      childTreeItem.setTreeItem(treeItem, this.appData)

      if (index == this.itemChildren.childElementCount) {
        this.itemChildren.appendChild(childTreeItem)
      } else {
        this.itemChildren.insertBefore(childTreeItem, this.itemChildren.children[index])
      }
    } else {
      this.collapse()
    }
  }

  childAdded(event) {
    const { childItem, index } = event
    // if (!childItem.testFlag(ItemFlags.INVISIBLE))
    this.addChild(childItem, index)
  }

  childRemoved(event) {
    const { childItem, index } = event
    if (this.expanded) {
      this.itemChildren.children[index].destroy()
      this.itemChildren.removeChild(this.itemChildren.children[index])
    }
  }

  getChild(index) {
    return this.itemChildren.children[index]
  }

  getChildByTreeItem(treeItem) {
    for (let i = 0; i < this.itemChildren.children.length; i++) {
      if (this.itemChildren.children[i].treeItem == treeItem) return this.itemChildren.children[i]
    }
    return null
  }

  /**
   * The destroy method.
   */
  destroy() {
    this.treeItem.removeListenerById('selectedChanged', this.updateSelectedId)
    if (this.treeItem instanceof TreeItem) {
      this.treeItem.removeListenerById('highlightChanged', this.updateHighlightId)
      this.treeItem.removeListenerById('visibilityChanged', this.updateVisibilityId)
      this.treeItem.removeListenerById('childAdded', this.childAddedId)
      this.treeItem.removeListenerById('childRemoved', this.childRemovedId)
    }
  }
}

TreeItemView.css = `
  /* tree-view.css */

  .TreeNodesList {
    border-left: 1px dotted;
    list-style-type: none;
    padding: 0 4px 0 4px;
    margin: 0 0 0 12px;
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

  .TreeNodesListItem {
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
    margin: 2px 0 0 0;
  }
  .TreeNodesListItem__ToggleVisibility {
    margin: 8px 0 0 0;
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

  .ItemContainer {
    min-width: max-content;
  }

  .TreeNodeHeader {
    display: flex;
    margin: 0 auto;
    color: azure;
    
    position: relative;
  }

  .TreeItemName {
    cursor: default;
    padding: 2px 4px;
    border-radius: 5px;
    
  }

  .TreeNodesListItem:hover {
    background-color: #e1f5fe;
  }

  .TreeNodesListItem__Dragging {
    background-color: #e1f5fe;
  }

  .TreeNodesListItem--isSelected > .TreeNodeHeader > .TreeItemName {
    // background-color: #76d2bb;
    color: #3B3B3B;
  }

  .TreeNodesListItem--isHidden > .TreeNodeHeader >  .TreeItemName {
    color: #9e9e9e;
  }

  .TreeNodesListItem--isHighlighted > .TreeNodeHeader >  .TreeItemName {
    // border-style: solid;
    // border-width: thin;
  }

/* Tooltip text */
.TreeNodeHeader .tooltiptext {
  display: flex;
  visibility: hidden;
  background-color: #aaa;
  color: #fff;
  text-align: center;
  padding: 2px 4px;
  border-radius: 6px;
  width: 200px;
  height: 22px;

  /* Position the tooltip text */
  position: absolute;
  z-index: 1000;
  bottom: -125%;
  left: 50%;
  margin-top: -50px;
  margin-left: -50px;

  /* Fade in tooltip */
  opacity: 0;
  transition: opacity 0.3s;
}

/* Tooltip arrow */
.TreeNodeHeader .tooltiptext::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 90%;
  margin-left: -5px;
  border-width: 5px;
  border-style: solid;
  border-color: #555 transparent transparent transparent;
}

/* Show the tooltip text when you mouse over the tooltip container */
.TreeNodeHeader:hover .tooltiptext {
  visibility: visible;
  opacity: 1;
}
  `

customElements.define('tree-item-view', TreeItemView)

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
    super()

    const shadowRoot = this.attachShadow({ mode: 'open' })

    // Add component CSS
    const styleTag = document.createElement('style')
    styleTag.appendChild(
      document.createTextNode(`
    .TreeView {
      height: 200px;
    }`)
    )
    shadowRoot.appendChild(styleTag)

    // Create container tags
    this.treeContainer = document.createElement('div')
    this.treeContainer.className = 'TreeView'
    shadowRoot.appendChild(this.treeContainer)

    // Init root tree item
    this.treeItemView = document.createElement('tree-item-view')
    this.treeContainer.appendChild(this.treeItemView)

    this.__onKeyDown = this.__onKeyDown.bind(this)
    this.__onMouseEnter = this.__onMouseEnter.bind(this)
    this.__onMouseLeave = this.__onMouseLeave.bind(this)
    document.addEventListener('keydown', this.__onKeyDown)
    this.addEventListener('mouseenter', this.__onMouseEnter)
    this.addEventListener('mouseleave', this.__onMouseLeave)
  }

  /**
   * Set tree item.
   * @param {object} treeItem Tree item.
   * @param {object} appData App data.
   */
  setTreeItem(treeItem, appData) {
    this.rootTreeItem = treeItem
    this.appData = appData

    // calculate the weight of the entire tree before displaying.
    if (displayTreeComplexity) {
      rootTreeItemView = this.treeItemView
      totalWeight = calcTreeWeight(this.rootTreeItem)
    }

    this.treeItemView.setTreeItem(treeItem, appData)

    if (this.appData && this.appData.selectionManager) {
      this.appData.selectionManager.on('selectionChanged', (event) => {
        const { selection } = event
        this.expandSelection(selection, true)
      })
    }
  }

  setDebugTreeComplexityMode() {
    displayTreeComplexity = true
  }

  __onMouseEnter(event) {
    this.mouseOver = true
  }

  __onMouseLeave(event) {
    this.mouseOver = false
  }

  __onKeyDown(event) {
    if (!this.mouseOver || !this.appData) return
    const { selectionManager } = this.appData
    // if (!selectionManager) return
    const selectedItems = selectionManager
      ? selectionManager.getSelection()
      : selectedItem
      ? new Set([selectedItem])
      : new Set()

    if (event.key == 'f') {
      // const selectedItems = selectionManager.getSelection()
      this.expandSelection(selectedItems, true)
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (event.key == 'ArrowLeft') {
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        newSelection.add(item.getOwner())
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (event.key == 'ArrowRight') {
      // const selectedItems = selectionManager.getSelection()
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        if (item instanceof TreeItem && item.getNumChildren() > 0) newSelection.add(item.getChild(0))
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
        this.expandSelection(newSelection, true)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (event.key == 'ArrowUp') {
      // const selectedItems = selectionManager.getSelection()
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        const index = item.getOwner().getChildIndex(item)
        if (index == 0) newSelection.add(item.getOwner())
        else {
          newSelection.add(item.getOwner().getChild(index - 1))
        }
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
        this.expandSelection(newSelection)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (event.key == 'ArrowDown') {
      // const selectedItems = selectionManager.getSelection()
      const newSelection = new Set()
      Array.from(selectedItems).forEach((item) => {
        if (!item.getOwner()) return

        const index = item.getOwner().getChildIndex(item)
        if (index < item.getOwner().getNumChildren() - 1) newSelection.add(item.getOwner().getChild(index + 1))
        else {
          const indexinOwner = item.getOwner().getChildIndex(item)
          if (item.getOwner().getNumChildren() > indexinOwner + 1)
            newSelection.add(item.getOwner().getChild(indexinOwner + 1))
        }
      })
      if (newSelection.size > 0) {
        selectionManager.setSelection(newSelection)
        this.expandSelection(newSelection, true)
      }
      event.preventDefault()
      event.stopPropagation()
      return
    }
  }
  /**
   * The expandSelection method.
   * @param {Map} items - The items we wish to expand to show.
   */
  expandSelection(items, scrollToView = true) {
    Array.from(items).forEach((item) => {
      const path = []
      while (true) {
        path.splice(0, 0, item)
        if (item == this.rootTreeItem) break
        item = item.getOwner()
      }
      let treeViewItem = this.treeItemView
      path.forEach((item, index) => {
        if (index < path.length - 1 && treeViewItem) {
          if (treeViewItem.treeItem != item) {
            console.log('Invalid tree view structure:', treeViewItem.treeItem.getName(), item.getName())
          }
          if (!treeViewItem.expanded) {
            treeViewItem.expand()
          }
          treeViewItem = treeViewItem.getChildByTreeItem(path[index + 1])
        }
      })
      // causes the element to be always at the top of the view.
      if (scrollToView && treeViewItem)
        treeViewItem.titleElement.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
          inline: 'nearest',
        })
    })
  }
}

customElements.define('scene-tree-view', SceneTreeView)

export default SceneTreeView
