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
      
      // Add ambient light
      vec3 ambient = u_Color * 0.3;
      
      gl_FragColor = vec4(diffuse + ambient, 1.0);
    } else {
      gl_FragColor = vec4(u_Color, 1.0);
    }
  }
`;

// Global variables
let gl;
let canvas;

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

// UI element values
let globalRotationX = 0;
let globalRotationY = 0;
let jointAngle1 = 0;
let jointAngle2 = 0;

// FPS calculation
let frameCount = 0;
let lastFpsUpdateTime = 0;

// Add a new global variable for zoom
let zoomLevel = 5.0; // Default zoom level

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
  
  // Enable depth test
  gl.enable(gl.DEPTH_TEST);
  
  // Set up event listeners for UI controls
  setupEventListeners();
  
  // Initialize matrices
  updateViewMatrix(); // New function to update view matrix based on zoom
  projMatrix.setPerspective(30, canvas.width / canvas.height, 0.1, 100);
  
  // Initial rendering
  renderScene();
  
  // Start animation tick if needed
  requestAnimationFrame(tick);
}

function updateViewMatrix() {
  viewMatrix.setLookAt(0, 0, zoomLevel, 0, 0, 0, 0, 1, 0);
}

function setupEventListeners() {
  // Global rotation sliders
  document.getElementById("globalRotationX").addEventListener("input", function(ev) {
    // Swap X for Y to match the expected behavior
    globalRotationY = parseInt(ev.target.value);
    document.getElementById("globalRotationXValue").textContent = globalRotationY + "°";
    renderScene();
  });
  
  document.getElementById("globalRotationY").addEventListener("input", function(ev) {
    // Swap Y for X to match the expected behavior
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
  
  // Add zoom control slider
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
  
  // Mouse rotation - also swap the X and Y handling
  canvas.addEventListener("mousemove", function(ev) {
    if (ev.buttons & 1) { // Left mouse button is pressed
      const rect = ev.target.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      
      const dx = ev.movementX;
      const dy = ev.movementY;
      
      // Update global rotation based on mouse movement (swapped)
      globalRotationX += dx / 2; // Was globalRotationY
      globalRotationY += dy / 2; // Was globalRotationX
      
      // Constrain rotation values
      globalRotationX = Math.max(-180, Math.min(180, globalRotationX));
      globalRotationY = Math.max(-180, Math.min(180, globalRotationY));
      
      // Update UI sliders (swapped)
      document.getElementById("globalRotationY").value = globalRotationX; 
      document.getElementById("globalRotationX").value = globalRotationY;
      document.getElementById("globalRotationYValue").textContent = Math.floor(globalRotationX) + "°";
      document.getElementById("globalRotationXValue").textContent = Math.floor(globalRotationY) + "°";
      
      renderScene();
    }
  });
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
  
  // Update animation
  if (animationEnabled) {
    const deltaTime = timestamp - lastTimestamp;
    animationAngle += deltaTime * 0.05; // Adjust speed as needed
    
    // Apply animation to joint angles
    document.getElementById("jointAngle1").value = 45 * Math.sin(animationAngle * 0.01);
    document.getElementById("jointAngle2").value = 30 * Math.sin(animationAngle * 0.02);
    
    // Trigger the input event to update the display values
    document.getElementById("jointAngle1").dispatchEvent(new Event("input"));
    document.getElementById("jointAngle2").dispatchEvent(new Event("input"));
    
    renderScene();
  }
  
  lastTimestamp = timestamp;
  requestAnimationFrame(tick);
}

function renderScene() {
  // Clear the canvas and depth buffer
  gl.clearColor(0.8, 0.8, 0.8, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // Set up matrices
  globalRotationMatrix.setIdentity();
  globalRotationMatrix.rotate(globalRotationY, 1, 0, 0);
  globalRotationMatrix.rotate(globalRotationX, 0, 1, 0);
  
  // Set uniform matrices
  const u_GlobalRotationMatrix = gl.getUniformLocation(gl.program, "u_GlobalRotationMatrix");
  const u_ViewMatrix = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  const u_ProjMatrix = gl.getUniformLocation(gl.program, "u_ProjMatrix");
  const u_Color = gl.getUniformLocation(gl.program, "u_Color");
  const u_UseLighting = gl.getUniformLocation(gl.program, "u_UseLighting");
  
  gl.uniformMatrix4fv(u_GlobalRotationMatrix, false, globalRotationMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
  
  // Set lighting
  gl.uniform1i(u_UseLighting, true);
  const u_LightDirection = gl.getUniformLocation(gl.program, "u_LightDirection");
  const u_LightColor = gl.getUniformLocation(gl.program, "u_LightColor");
  gl.uniform3f(u_LightDirection, 0.5, 3.0, 4.0); // Light direction
  gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);     // White light
  
  // Draw the panda
  drawPanda();
}

function drawPanda() {
  // Reset model matrix for the body
  modelMatrix.setIdentity();
  modelMatrix.translate(0, 0, 0);
  modelMatrix.scale(1.2, 1, 1.5);  // Body shape
  
  // Body - white
  const bodyColor = [0.9, 0.9, 0.9];
  const bodyColorLocation = gl.getUniformLocation(gl.program, "u_Color");
  gl.uniform3fv(bodyColorLocation, bodyColor);
  
  const bodyCube = new Cube(0, 0, 0, 1.0, bodyColor);
  bodyCube.render(gl, modelMatrix, bodyColorLocation);
  
  // Head
  const headMatrix = new Matrix4(modelMatrix);
  headMatrix.translate(0, 0.8, 0.6);  // Position above and in front of body
  headMatrix.scale(0.8, 0.8, 0.8);    // Slightly smaller than body
  
  const headCube = new Cube(0, 0, 0, 1.0, bodyColor); // White head
  headCube.render(gl, headMatrix, bodyColorLocation);
  
  // Eyes - black patches
  const blackColor = [0.1, 0.1, 0.1];
  gl.uniform3fv(bodyColorLocation, blackColor);
  
  // Left eye patch
  const leftEyePatchMatrix = new Matrix4(headMatrix);
  leftEyePatchMatrix.translate(-0.3, 0.1, 0.4);
  leftEyePatchMatrix.scale(0.3, 0.3, 0.1);
  
  const leftEyePatch = new Cube(0, 0, 0, 1.0, blackColor);
  leftEyePatch.render(gl, leftEyePatchMatrix, bodyColorLocation);
  
  // Right eye patch
  const rightEyePatchMatrix = new Matrix4(headMatrix);
  rightEyePatchMatrix.translate(0.3, 0.1, 0.4);
  rightEyePatchMatrix.scale(0.3, 0.3, 0.1);
  
  const rightEyePatch = new Cube(0, 0, 0, 1.0, blackColor);
  rightEyePatch.render(gl, rightEyePatchMatrix, bodyColorLocation);
  
  // Nose
  const noseMatrix = new Matrix4(headMatrix);
  noseMatrix.translate(0, -0.1, 0.4);
  noseMatrix.scale(0.2, 0.2, 0.1);
  
  const nose = new Cube(0, 0, 0, 1.0, blackColor);
  nose.render(gl, noseMatrix, bodyColorLocation);
  
  // Ears
  // Left ear
  const leftEarMatrix = new Matrix4(headMatrix);
  leftEarMatrix.translate(-0.4, 0.4, 0);
  leftEarMatrix.scale(0.2, 0.2, 0.2);
  
  const leftEar = new Cube(0, 0, 0, 1.0, blackColor);
  leftEar.render(gl, leftEarMatrix, bodyColorLocation);
  
  // Right ear
  const rightEarMatrix = new Matrix4(headMatrix);
  rightEarMatrix.translate(0.4, 0.4, 0);
  rightEarMatrix.scale(0.2, 0.2, 0.2);
  
  const rightEar = new Cube(0, 0, 0, 1.0, blackColor);
  rightEar.render(gl, rightEarMatrix, bodyColorLocation);
  
  // Front legs with joint rotation
  // Left front leg - upper part
  gl.uniform3fv(bodyColorLocation, blackColor);
  
  const leftFrontLegMatrix = new Matrix4(modelMatrix);
  leftFrontLegMatrix.translate(-0.5, -0.4, 0.4);
  leftFrontLegMatrix.rotate(jointAngle1, 1, 0, 0); // Rotate around X axis
  leftFrontLegMatrix.scale(0.2, 0.5, 0.2);
  
  const leftFrontLeg = new Cube(0, 0, 0, 1.0, blackColor);
  leftFrontLeg.render(gl, leftFrontLegMatrix, bodyColorLocation);
  
  // Left front leg - lower part (with second joint)
  const leftFrontLowerLegMatrix = new Matrix4(leftFrontLegMatrix);
  leftFrontLowerLegMatrix.translate(0, -1.0, 0);
  leftFrontLowerLegMatrix.rotate(jointAngle2, 1, 0, 0); // Second joint rotation
  leftFrontLowerLegMatrix.scale(1.0, 0.8, 1.0);
  
  const leftFrontLowerLeg = new Cube(0, 0, 0, 1.0, blackColor);
  leftFrontLowerLeg.render(gl, leftFrontLowerLegMatrix, bodyColorLocation);
  
  // Right front leg - upper part
  const rightFrontLegMatrix = new Matrix4(modelMatrix);
  rightFrontLegMatrix.translate(0.5, -0.4, 0.4);
  rightFrontLegMatrix.rotate(jointAngle1, 1, 0, 0); // Rotate around X axis
  rightFrontLegMatrix.scale(0.2, 0.5, 0.2);
  
  const rightFrontLeg = new Cube(0, 0, 0, 1.0, blackColor);
  rightFrontLeg.render(gl, rightFrontLegMatrix, bodyColorLocation);
  
  // Right front leg - lower part
  const rightFrontLowerLegMatrix = new Matrix4(rightFrontLegMatrix);
  rightFrontLowerLegMatrix.translate(0, -1.0, 0);
  rightFrontLowerLegMatrix.rotate(jointAngle2, 1, 0, 0); // Second joint rotation
  rightFrontLowerLegMatrix.scale(1.0, 0.8, 1.0);
  
  const rightFrontLowerLeg = new Cube(0, 0, 0, 1.0, blackColor);
  rightFrontLowerLeg.render(gl, rightFrontLowerLegMatrix, bodyColorLocation);
  
  // Back legs
  // Left back leg
  const leftBackLegMatrix = new Matrix4(modelMatrix);
  leftBackLegMatrix.translate(-0.5, -0.4, -0.4);
  leftBackLegMatrix.rotate(jointAngle1, 1, 0, 0); // Rotate around X axis
  leftBackLegMatrix.scale(0.2, 0.5, 0.2);
  
  const leftBackLeg = new Cube(0, 0, 0, 1.0, blackColor);
  leftBackLeg.render(gl, leftBackLegMatrix, bodyColorLocation);
  
  // Right back leg
  const rightBackLegMatrix = new Matrix4(modelMatrix);
  rightBackLegMatrix.translate(0.5, -0.4, -0.4);
  rightBackLegMatrix.rotate(jointAngle1, 1, 0, 0); // Rotate around X axis
  rightBackLegMatrix.scale(0.2, 0.5, 0.2);
  
  const rightBackLeg = new Cube(0, 0, 0, 1.0, blackColor);
  rightBackLeg.render(gl, rightBackLegMatrix, bodyColorLocation);
  
  // Tail
  const tailMatrix = new Matrix4(modelMatrix);
  tailMatrix.translate(0, -0.3, -0.7);
  tailMatrix.scale(0.2, 0.2, 0.2);
  
  const tail = new Cube(0, 0, 0, 1.0, blackColor);
  tail.render(gl, tailMatrix, bodyColorLocation);
} 