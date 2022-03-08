class ZeaProgressBar extends HTMLElement {
  constructor() {
    super()
    const shadowRoot = this.attachShadow({ mode: 'open' })

    this.progress = document.createElement('progress')
    // this.progress.classList.add('progress-display')
    // this.progress.textContent = '0%'
    this.progress.setAttribute('id', 'progress')
    this.progress.setAttribute('value', '0')
    this.progress.setAttribute('max', '100')
    this.progress.classList.add('hidden')
    shadowRoot.appendChild(this.progress)

    const styleTag = document.createElement('style')
    styleTag.appendChild(
      document.createTextNode(`
      
      .hidden {
        visibility: hidden;
      }
      #progress {
        position: absolute;
        left: 0px;
        top: 0px;
        width: 100%;
        height: 100%;
      }
      progress::-webkit-progress-value {
        background: #f9ce03;
      }
      progress {
        color: #f9ce03;
      }
`)
    )
    shadowRoot.appendChild(styleTag)
  }

  set resourceLoader(resourceLoader) {
    let hideId = 0
    resourceLoader.on('progressIncremented', (event) => {
      this.progress.value = event.percent
      if (event.percent >= 100) {
        hideId = setTimeout(() => this.progress.classList.add('hidden'), 1000)
      } else if (event.percent < 100) {
        if (hideId) {
          clearTimeout(hideId)
          hideId = 0
        }
        this.progress.classList.remove('hidden')
      }
    })
  }
}

customElements.define('zea-progress-bar', ZeaProgressBar)
