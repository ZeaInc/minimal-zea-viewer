import auth from "./auth.js";
const { Color } = window.zeaEngine;

export const getRandomString = (charCount = 3) =>
  Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(0, charCount);

const getRandomRoomId = () => {
  return `${getRandomString(3)}-${getRandomString(3)}-${getRandomString(3)}`;
};

const setURLParam = (key, value) => {
  var url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.pushState({}, null, url.href);
};

class LoginDialog extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: "open" });

    this.modal = document.createElement("div");
    this.modal.classList.add("modal");
    shadowRoot.appendChild(this.modal);

    this.modalContent = document.createElement("div");
    this.modalContent.classList.add("modal-content");
    this.modal.appendChild(this.modalContent);

    this.modalContent.innerHTML = `
        <div class="imgcontainer">
          <img src="./data/logo-zea.svg" alt="Avatar" class="avatar">
        </div>

        <div class="container">
          <label for="uname"><b>Username</b></label>
          <input id="uname" type="text" placeholder="Enter Username" name="uname" required>

          <label for="psw"><b>Password</b></label>
          <input id="psw" type="password" placeholder="Enter Password" name="psw" required>

          <label for="room"><b>Room ID</b></label>
          <input id="room" type="text" placeholder="Enter Room ID" name="room" required>

          <button type="submit" id="login">Login</button>
        </div>`;

    const uname = this.shadowRoot.getElementById("uname");
    const psw = this.shadowRoot.getElementById("psw");
    psw.addEventListener("input", () => {
      psw.style.border = "";
    });
    const room = this.shadowRoot.getElementById("room");

    const urlParams = new URLSearchParams(window.location.search);
    let roomId = urlParams.has("roomId")
      ? urlParams.get("roomId")
      : getRandomRoomId();

    room.value = roomId;

    auth.getUserData().then((userData) => {
      uname.value = userData.firstName;
    });

    // When the user clicks on <span> (x), close the modal
    const loginBtn = this.shadowRoot.getElementById("login");
    loginBtn.onclick = async () => {
      const userId = getRandomString();
      const userData = {
        color: Color.random().toHex(),
        firstName: uname.value,
        id: userId.value,
        lastName: "",
        password: psw.value,
        username: uname.value,
      };

      if (room.value) setURLParam("roomId", room.value);

      try {
        await auth.setUserData(userData);
      } catch (e) {
        psw.style.border = "2px solid #f00";
        return;
      }
      // if (!auth.isAuthenticated()) {
      //   psw.style.border = "2px solid #f00";
      //   return;
      // }
      this.modal.style.display = "none";
      this.onCloseCallback();
    };

    const styleTag = document.createElement("style");
    styleTag.appendChild(
      document.createTextNode(`
/* The Modal (background) */
.modal {
  display: none; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
}

/* Modal Content/Box */
.modal-content {
  background-color: #eeeeee;
  margin: 15% auto; /* 15% from the top and centered */
  padding: 20px;
  border: 1px solid #888;
  width: 80%; /* Could be more or less, depending on screen size */
  max-width: 600px;
}


/* The Close Button */
.close {
  color: #aaa;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}

/* Full-width inputs */
input[type=text], input[type=password] {
  width: 100%;
  padding: 12px 20px;
  margin: 8px 0;
  display: inline-block;
  border: 1px solid #ccc;
  box-sizing: border-box;
}

/* Set a style for all buttons */
button {
  background-color: #f9ce03;
  color: black;
  padding: 14px 20px;
  margin: 8px 0;
  border: none;
  cursor: pointer;
  width: 100%;
}

/* Add a hover effect for buttons */
button:hover {
  opacity: 0.8;
}

/* Extra style for the cancel button (red) */
.cancelbtn {
  width: auto;
  padding: 10px 18px;
  background-color: #f44336;
}

/* Center the avatar image inside this container */
.imgcontainer {
  text-align: center;
  margin: 24px 0 12px 0;
}

/* Avatar image */
img.avatar {
  height: 40px;
}

/* Add padding to containers */
.container {
  padding: 16px;
}

/* The "Forgot password" text */
span.psw {
  float: right;
  padding-top: 16px;
}

/* Change styles for span and cancel button on extra small screens */
@media screen and (max-width: 300px) {
  span.psw {
    display: block;
    float: none;
  }
  .cancelbtn {
    width: 100%;
  }
}

`)
    );
    shadowRoot.appendChild(styleTag);
  }

  show(onCloseCallback) {
    this.modal.style.display = "block";
    this.onCloseCallback = onCloseCallback;
  }
}

customElements.define("login-dialog", LoginDialog);
