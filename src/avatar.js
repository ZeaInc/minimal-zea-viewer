class Avatar extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: "open" });

    this.avatar = document.createElement("div");
    this.avatar.classList.add("avatar");
    shadowRoot.appendChild(this.avatar);

    const styleTag = document.createElement("style");
    styleTag.appendChild(
      document.createTextNode(`
      .avatar {
        /* This image is 687 wide by 1024 tall, similar to your aspect ratio */
        background-image: url('http://i.stack.imgur.com/Dj7eP.jpg');
        
        /* make a square container */
        width: 28px;
        height: 28px;
    
        /* fill the container, preserving aspect ratio, and cropping to fit */
        background-size: cover;
    
        /* center the image vertically and horizontally */
        background-position: top center;
    
        /* round the edges to a circle with border radius 1/2 container size */
        border-radius: 50%;
        border-width: medium;
        border-color: beige;
        border-style: solid;
    }
`)
    );
    shadowRoot.appendChild(styleTag);
  }

  set userData(data) {
    if (data.image) {
      this.avatar.style["background-image"] = data.image;
    }
  }
}

customElements.define("zea-avatar", Avatar);
