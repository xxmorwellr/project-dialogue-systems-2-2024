import "./style.css";
import { setupButton } from "./dm.js";

// Set `#app` content and initialize button events
document.querySelector("#app")!.innerHTML = `
  <div id="dialog-container">
    <div id="dialog-content">Dialogue Content</div>
  </div>
  <div class="card">
    <button id="counter" type="button">Start your order!</button>
  </div>
`;

setupButton(document.querySelector("#counter")!);