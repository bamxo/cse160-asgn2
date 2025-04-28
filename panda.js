// Panda.js - Main file for panda rendering
// This file handles the WebGL initialization and rendering

// Vertex shader program
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;
  
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotationMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  uniform vec3 u_LightDirection;
  
  varying vec4 v_Color;
  varying vec3 v_Normal;
  
  void main() {
    gl_Position = u_ProjMatrix * u_ViewMatrix * u_GlobalRotationMatrix * u_ModelMatrix * a_Position;
    
    // Calculate lighting effect if normal is available
    v_Normal = normalize(vec3(u_ModelMatrix * a_Normal));
  }
`;

// Fragment shader program
const FSHADER_SOURCE = `
  precision mediump float;
  
  uniform vec3 u_Color;
  uniform vec3 u_LightColor;
  uniform vec3 u_LightDirection;
  uniform bool u_UseLighting;
  
  varying vec3 v_Normal;
  
  void main() {
    if (u_UseLighting) {
      // Calculate the light direction and make it unit length
      vec3 lightDirection = normalize(u_LightDirection);
      
      // Calculate the dot product of light direction and normal
      float nDotL = max(dot(lightDirection, v_Normal), 0.0);
      
      // Calculate the color due to diffuse reflection
      vec3 diffuse = u_LightColor * u_Color * nDotL;
      
      // Add ambient light - adjusted to match Minecraft textures
      vec3 ambient = u_Color * 0.65;
      
      gl_FragColor = vec4(diffuse + ambient, 1.0);
    } else {
      gl_FragColor = vec4(u_Color, 1.0);
    }
  }
`;

// Global variables
let gl;
let canvas;
let panda;

// Matrices
let modelMatrix = new Matrix4();
let viewMatrix = new Matrix4();
let projMatrix = new Matrix4();
let globalRotationMatrix = new Matrix4();

// Animation control
let animationEnabled = false;
let animationAngle = 0;
let lastTimestamp = 0;
let fps = 0;

// UI element values - set to match the Minecraft panda reference angles
let globalRotationX = -33.5;
let globalRotationY = -1.5;
let jointAngle1 = 0;
let jointAngle2 = 0;
let headAngle = 0;

// FPS calculation
let frameCount = 0;
let lastFpsUpdateTime = 0;

// Zoom level - adjusted to match request
let zoomLevel = 7.5;

function main() {
  // Initialize canvas and WebGL context
  canvas = document.getElementById("webgl");
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.error("Failed to get the rendering context for WebGL");
    return;
  }
  
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error("Failed to initialize shaders");
    return;
  }
  
  // Create panda instance
  panda = new Panda();
  
  // Enable depth test
  gl.enable(gl.DEPTH_TEST);
  
  // Set up event listeners for UI controls
  setupEventListeners();
  
  // Initialize matrices
  updateViewMatrix();
  projMatrix.setPerspective(30, canvas.width / canvas.height, 0.1, 100);
  
  // Update UI to match initial values
  document.getElementById("globalRotationX").value = globalRotationY;
  document.getElementById("globalRotationY").value = globalRotationX;
  document.getElementById("globalRotationXValue").textContent = globalRotationY + "°";
  document.getElementById("globalRotationYValue").textContent = globalRotationX + "°";
  document.getElementById("zoomControl").value = zoomLevel;
  document.getElementById("zoomValue").textContent = zoomLevel.toFixed(1);
  
  // Add UI hint about shift-click functionality
  addShiftClickHint();
  
  // Initial rendering
  renderScene();
  
  // Start animation tick
  requestAnimationFrame(tick);
}

function updateViewMatrix() {
  viewMatrix.setLookAt(0, 0.5, zoomLevel, 0, 0, 0, 0, 1, 0);
}

function setupEventListeners() {
  // Global rotation sliders
  document.getElementById("globalRotationX").addEventListener("input", function(ev) {
    globalRotationY = parseInt(ev.target.value);
    document.getElementById("globalRotationXValue").textContent = globalRotationY + "°";
    renderScene();
  });
  
  document.getElementById("globalRotationY").addEventListener("input", function(ev) {
    globalRotationX = parseInt(ev.target.value);
    document.getElementById("globalRotationYValue").textContent = globalRotationX + "°";
    renderScene();
  });
  
  // Joint angle sliders
  document.getElementById("jointAngle1").addEventListener("input", function(ev) {
    jointAngle1 = parseInt(ev.target.value);
    document.getElementById("jointAngle1Value").textContent = jointAngle1 + "°";
    renderScene();
  });
  
  document.getElementById("jointAngle2").addEventListener("input", function(ev) {
    jointAngle2 = parseInt(ev.target.value);
    document.getElementById("jointAngle2Value").textContent = jointAngle2 + "°";
    renderScene();
  });
  
  // Head angle slider
  document.getElementById("headAngle").addEventListener("input", function(ev) {
    headAngle = parseInt(ev.target.value);
    document.getElementById("headAngleValue").textContent = headAngle + "°";
    renderScene();
  });
  
  // Zoom control slider
  document.getElementById("zoomControl").addEventListener("input", function(ev) {
    zoomLevel = parseFloat(ev.target.value);
    document.getElementById("zoomValue").textContent = zoomLevel.toFixed(1);
    updateViewMatrix();
    renderScene();
  });
  
  // Add mouse wheel zoom
  canvas.addEventListener("wheel", function(ev) {
    ev.preventDefault(); // Prevent page scrolling
    
    // Adjust zoom level based on wheel delta
    const zoomSensitivity = 0.1;
    zoomLevel += (ev.deltaY > 0) ? zoomSensitivity : -zoomSensitivity;
    
    // Constrain zoom level to reasonable values
    zoomLevel = Math.max(1.0, Math.min(15.0, zoomLevel));
    
    // Update slider value
    document.getElementById("zoomControl").value = zoomLevel;
    document.getElementById("zoomValue").textContent = zoomLevel.toFixed(1);
    
    updateViewMatrix();
    renderScene();
  });
  
  // Animation toggle
  document.getElementById("toggleAnimation").addEventListener("click", function() {
    animationEnabled = !animationEnabled;
    this.textContent = animationEnabled ? "Stop Animation" : "Start Animation";
  });
  
  // Handle mouse events for rotation and poke animation
  canvas.addEventListener("mousedown", function(ev) {
    // Check if shift key is pressed
    if (ev.shiftKey) {
      // Determine the new state after toggling
      const willBeFlipped = !panda.isFlipped;
      
      // Trigger poke animation
      panda.startPokeAnimation();
      
      // Add info text to show what's happening
      const infoElement = document.getElementById("pokeInfo") || createPokeInfoElement();
      infoElement.textContent = willBeFlipped ? "Panda flipped upside down and kicking!" : "Panda flipped back to normal!";
      infoElement.style.opacity = "1";
      
      // Fade out the info text after 2 seconds
      setTimeout(() => {
        infoElement.style.opacity = "0";
      }, 2000);
    }
  });
  
  // Mouse rotation
  canvas.addEventListener("mousemove", function(ev) {
    if (ev.buttons & 1) { // Left mouse button is pressed
      const dx = ev.movementX;
      const dy = ev.movementY;
      
      // Update global rotation based on mouse movement
      globalRotationX += dx / 2;
      globalRotationY += dy / 2;
      
      // Constrain rotation values
      globalRotationX = Math.max(-180, Math.min(180, globalRotationX));
      globalRotationY = Math.max(-180, Math.min(180, globalRotationY));
      
      // Update UI sliders
      document.getElementById("globalRotationY").value = globalRotationX;
      document.getElementById("globalRotationX").value = globalRotationY;
      
      // Update UI text
      document.getElementById("globalRotationYValue").textContent = globalRotationX + "°";
      document.getElementById("globalRotationXValue").textContent = globalRotationY + "°";
      
      renderScene();
    }
  });
}

// Helper function to create info element for poke animation
function createPokeInfoElement() {
  const infoElement = document.createElement("div");
  infoElement.id = "pokeInfo";
  infoElement.style.position = "absolute";
  infoElement.style.top = "10px";
  infoElement.style.left = "50%";
  infoElement.style.transform = "translateX(-50%)";
  infoElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  infoElement.style.color = "white";
  infoElement.style.padding = "10px 20px";
  infoElement.style.borderRadius = "5px";
  infoElement.style.fontFamily = "Arial, sans-serif";
  infoElement.style.fontSize = "16px";
  infoElement.style.opacity = "0";
  infoElement.style.transition = "opacity 0.5s ease";
  infoElement.style.zIndex = "100";
  document.body.appendChild(infoElement);
  return infoElement;
}

function tick(timestamp) {
  // Calculate FPS
  frameCount++;
  const elapsed = timestamp - lastFpsUpdateTime;
  
  if (elapsed >= 1000) { // Update FPS every second
    fps = Math.round(frameCount * 1000 / elapsed);
    document.getElementById("fpsCounter").textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastFpsUpdateTime = timestamp;
  }
  
  // Check if poke animation is active or panda is flipped
  let shouldRender = false;
  
  if (panda.isPoking || panda.isFlipped) {
    // Always render scene during poke animation or when flipped
    shouldRender = true;
  }
  
  // Update animation
  if (animationEnabled) {
    const deltaTime = timestamp - lastTimestamp;
    animationAngle += deltaTime * 0.05; // Adjust speed as needed
    
    // Apply animation to joint angles with more prominent alternating movement
    // Left side moves forward while right side moves back
    const amplitude = 60; // Increased amplitude for more prominent movement
    const frequency = 0.015; // Adjusted for smoother movement
    jointAngle1 = amplitude * Math.sin(animationAngle * frequency); // Left side
    jointAngle2 = -amplitude * Math.sin(animationAngle * frequency); // Right side - opposite phase
    
    // Add gentle head movement during animation
    const headAmplitude = 8; // Smaller amplitude for head
    const headFrequency = 0.01; // Slower frequency for head
    headAngle = headAmplitude * Math.sin(animationAngle * headFrequency);
    
    // Update UI sliders
    document.getElementById("jointAngle1").value = jointAngle1;
    document.getElementById("jointAngle2").value = jointAngle2;
    document.getElementById("headAngle").value = headAngle;
    
    // Update UI text
    document.getElementById("jointAngle1Value").textContent = Math.round(jointAngle1) + "°";
    document.getElementById("jointAngle2Value").textContent = Math.round(jointAngle2) + "°";
    document.getElementById("headAngleValue").textContent = Math.round(headAngle) + "°";
    
    shouldRender = true;
  }
  
  // Render the scene if needed
  if (shouldRender) {
    renderScene();
  }
  
  lastTimestamp = timestamp;
  requestAnimationFrame(tick);
}

function renderScene() {
  // Clear the canvas with the specified green background color (#256125)
  gl.clearColor(0.145, 0.38, 0.145, 1.0); // RGB values for #256125
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Set up matrices
  globalRotationMatrix.setIdentity();
  globalRotationMatrix.rotate(globalRotationY, 1, 0, 0);
  globalRotationMatrix.rotate(globalRotationX, 0, 1, 0);
  
  // Reset model matrix
  modelMatrix.setIdentity();
  
  // Translate model to be centered in view
  modelMatrix.translate(0, -0.5, 0);
  
  // Set uniform matrices
  const u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotationMatrix");
  const u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  const u_ProjMatrix = gl.getUniformLocation(gl.program, "u_ProjMatrix");
  const u_UseLighting = gl.getUniformLocation(gl.program, "u_UseLighting");
  
  gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotationMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
  
  // Set lighting to match Minecraft panda textures
  gl.uniform1i(u_UseLighting, true);
  const u_LightDirection = gl.getUniformLocation(gl.program, "u_LightDirection");
  const u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");
  gl.uniform3f(u_LightDirection, 0.8, 1.2, 0.6); // Adjusted for Minecraft-style flat lighting
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);     // White light
  
  // Render the panda
  panda.render(gl, modelMatrix, jointAngle1, jointAngle2, headAngle);
}

// Draw the panda's legs
drawLegs = function(gl, parentMatrix, colorLocation, jointAngle1, jointAngle2) {
  gl.uniform3fv(colorLocation, this.blackColor);
  
  // Make legs fatter and position them closer to the body
  
  // Front legs (black)
  // Left front leg
  const leftFrontLegMatrix = new Matrix4(parentMatrix);
  leftFrontLegMatrix.translate(-0.3, -0.5, 0.6); // Moved closer to body on X-axis
  leftFrontLegMatrix.rotate(jointAngle1, 1, 0, 0); // Left leg uses jointAngle1
  leftFrontLegMatrix.scale(0.4, 0.6, 0.4); // Fatter legs
  
  const leftFrontLeg = new Cube(0, 0, 0, 1.0, this.blackColor);
  leftFrontLeg.render(gl, leftFrontLegMatrix, colorLocation);
  
  // Right front leg
  const rightFrontLegMatrix = new Matrix4(parentMatrix);
  rightFrontLegMatrix.translate(0.3, -0.5, 0.6); // Moved closer to body on X-axis
  rightFrontLegMatrix.rotate(jointAngle2, 1, 0, 0); // Right leg uses jointAngle2
  rightFrontLegMatrix.scale(0.4, 0.6, 0.4); // Fatter legs
  
  const rightFrontLeg = new Cube(0, 0, 0, 1.0, this.blackColor);
  rightFrontLeg.render(gl, rightFrontLegMatrix, colorLocation);
  
  // Back legs (black)
  // Left back leg
  const leftBackLegMatrix = new Matrix4(parentMatrix);
  leftBackLegMatrix.translate(-0.3, -0.5, -0.6); // Moved closer to body on X-axis
  leftBackLegMatrix.rotate(jointAngle1, 1, 0, 0); // Left leg uses jointAngle1
  leftBackLegMatrix.scale(0.4, 0.6, 0.4); // Fatter legs
  
  const leftBackLeg = new Cube(0, 0, 0, 1.0, this.blackColor);
  leftBackLeg.render(gl, leftBackLegMatrix, colorLocation);
  
  // Right back leg
  const rightBackLegMatrix = new Matrix4(parentMatrix);
  rightBackLegMatrix.translate(0.3, -0.5, -0.6); // Moved closer to body on X-axis
  rightBackLegMatrix.rotate(jointAngle2, 1, 0, 0); // Right leg uses jointAngle2
  rightBackLegMatrix.scale(0.4, 0.6, 0.4); // Fatter legs
  
  const rightBackLeg = new Cube(0, 0, 0, 1.0, this.blackColor);
  rightBackLeg.render(gl, rightBackLegMatrix, colorLocation);
};

// Function to add shift-click hint
function addShiftClickHint() {
  const hintElement = document.createElement("div");
  hintElement.id = "shiftClickHint";
  hintElement.innerHTML = "💡 <b>Tip:</b> Shift+Click to flip the panda upside down and see it kick!";
  hintElement.style.position = "absolute";
  hintElement.style.bottom = "10px";
  hintElement.style.right = "10px";
  hintElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  hintElement.style.color = "white";
  hintElement.style.padding = "8px 12px";
  hintElement.style.borderRadius = "5px";
  hintElement.style.fontFamily = "Arial, sans-serif";
  hintElement.style.fontSize = "14px";
  hintElement.style.zIndex = "100";
  document.body.appendChild(hintElement);
}