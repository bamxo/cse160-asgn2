let VERTEX_SHADER = `
  precision mediump float;

  attribute vec3 a_Position;
  uniform float u_Size;

  void main() {
    gl_Position = vec4(a_Position * u_Size, 1.0);
  }

`;

let FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec3 u_Color;

  void main() {
    gl_FragColor = vec4(u_Color, 1.0);
  }

`;

// Global WebGL context
let gl;

// List to store all shapes
let shapesList = [];

// Shape type enum
const ShapeType = {
  POINT: 'point',
  TRIANGLE: 'triangle',
  SQUARE: 'square',
  CIRCLE: 'circle'
};

// Brush properties
let currentBrush = {
  color: [0.0, 0.5, 1.0],
  size: 1.0,
  shapeType: ShapeType.POINT,
  segments: 32  // Add default segments value
};

class Point {
  constructor(position, color = [...currentBrush.color], size = currentBrush.size) {
    this.position = position;
    this.color = color;
    this.size = size;
  }

  render(gl) {
    // Create and bind buffer for this point
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    // Create triangle vertices centered at the point's position
    let offset = 0.1; // Base offset for triangle size
    let triangle = new Float32Array([
      this.position[0], this.position[1] + (offset * this.size), this.position[2],          // Top point
      this.position[0] - (offset * this.size), this.position[1] - (offset * this.size), this.position[2],  // Bottom left
      this.position[0] + (offset * this.size), this.position[1] - (offset * this.size), this.position[2]   // Bottom right
    ]);
    
    gl.bufferData(gl.ARRAY_BUFFER, triangle, gl.STATIC_DRAW);

    // Set position attribute
    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Set uniforms
    let u_Color = gl.getUniformLocation(gl.program, "u_Color");
    let u_Size = gl.getUniformLocation(gl.program, "u_Size");
    
    gl.uniform3f(u_Color, this.color[0], this.color[1], this.color[2]);
    gl.uniform1f(u_Size, this.size);

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

class Triangle {
  constructor(position, color = [...currentBrush.color], size = currentBrush.size) {
    this.position = position;
    this.color = color;
    this.size = size;
  }

  render(gl) {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    let offset = 0.1 * this.size;
    let triangle = new Float32Array([
      this.position[0], this.position[1] + offset, this.position[2],
      this.position[0] - offset, this.position[1] - offset, this.position[2],
      this.position[0] + offset, this.position[1] - offset, this.position[2]
    ]);
    
    gl.bufferData(gl.ARRAY_BUFFER, triangle, gl.STATIC_DRAW);

    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    let u_Color = gl.getUniformLocation(gl.program, "u_Color");
    let u_Size = gl.getUniformLocation(gl.program, "u_Size");
    
    gl.uniform3f(u_Color, this.color[0], this.color[1], this.color[2]);
    gl.uniform1f(u_Size, 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

class Square {
  constructor(position, color = [...currentBrush.color], size = currentBrush.size) {
    this.position = position;
    this.color = color;
    this.size = size;
  }

  render(gl) {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    let offset = 0.1 * this.size;
    let square = new Float32Array([
      // First triangle
      this.position[0] - offset, this.position[1] + offset, this.position[2],
      this.position[0] - offset, this.position[1] - offset, this.position[2],
      this.position[0] + offset, this.position[1] + offset, this.position[2],
      // Second triangle
      this.position[0] + offset, this.position[1] + offset, this.position[2],
      this.position[0] - offset, this.position[1] - offset, this.position[2],
      this.position[0] + offset, this.position[1] - offset, this.position[2]
    ]);
    
    gl.bufferData(gl.ARRAY_BUFFER, square, gl.STATIC_DRAW);

    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    let u_Color = gl.getUniformLocation(gl.program, "u_Color");
    let u_Size = gl.getUniformLocation(gl.program, "u_Size");
    
    gl.uniform3f(u_Color, this.color[0], this.color[1], this.color[2]);
    gl.uniform1f(u_Size, 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}

class Circle {
  constructor(position, color = [...currentBrush.color], size = currentBrush.size, segments = currentBrush.segments) {
    this.position = position;
    this.color = color;
    this.size = size;
    this.segments = segments; // Use the segments from brush
  }

  render(gl) {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    let vertices = [];
    let radius = 0.1 * this.size;
    
    // Generate vertices for triangle fan
    for (let i = 0; i <= this.segments; i++) {
      let angle = (i / this.segments) * Math.PI * 2;
      vertices.push(this.position[0]); // Center x
      vertices.push(this.position[1]); // Center y
      vertices.push(this.position[2]); // Center z
      
      vertices.push(this.position[0] + radius * Math.cos(angle));
      vertices.push(this.position[1] + radius * Math.sin(angle));
      vertices.push(this.position[2]);
      
      vertices.push(this.position[0] + radius * Math.cos(angle + (2 * Math.PI / this.segments)));
      vertices.push(this.position[1] + radius * Math.sin(angle + (2 * Math.PI / this.segments)));
      vertices.push(this.position[2]);
    }
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    let u_Color = gl.getUniformLocation(gl.program, "u_Color");
    let u_Size = gl.getUniformLocation(gl.program, "u_Size");
    
    gl.uniform3f(u_Color, this.color[0], this.color[1], this.color[2]);
    gl.uniform1f(u_Size, 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, (this.segments + 1) * 3);
  }
}

class RocketShip {
  constructor(position, size = 1.0) {
    this.position = position;
    this.size = size;
    
    // Define colors for different parts of the rocket
    this.colors = {
      bodyDark: [0.25, 0.3, 0.35],     // Dark slate gray for main body parts
      bodyLight: [0.6, 0.4, 0.8],      // Brighter purple for body
      flame1: [0.9, 0.3, 0.2],         // Deep red for outer flame
      flame2: [1.0, 0.5, 0.2],         // Orange for middle flame
      flame3: [1.0, 0.8, 0.3]          // Yellow for inner flame
    };
  }

  render(gl) {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    // Base position
    let x = this.position[0];
    let y = this.position[1];
    let z = this.position[2];
    let s = this.size * 0.6; // Scale factor
    
    // Draw each part of the rocket in the correct order (back to front)
    this.drawSideFins(gl, x, y, z, s);
    this.drawFlames(gl, x, y, z, s);
    this.drawRocketBody(gl, x, y, z, s);
    this.drawRocketTip(gl, x, y, z, s);
  }
  
  drawRocketTip(gl, x, y, z, s) {
    // Top triangle (rocket tip) - dark gray
    let vertices = new Float32Array([
      x, y + 0.9 * s, z,            // Top point
      x - 0.2 * s, y + 0.5 * s, z,  // Left point
      x + 0.2 * s, y + 0.5 * s, z   // Right point
    ]);
    
    this.drawTriangle(gl, vertices, this.colors.bodyDark);
  }
  
  drawRocketBody(gl, x, y, z, s) {
    // Main body rectangle (2 triangles for purple section)
    // Upper body - purple rectangle
    let upperBodyVertices = new Float32Array([
      // First triangle (left upper body)
      x - 0.2 * s, y + 0.5 * s, z,  // Top left
      x - 0.2 * s, y - 0.2 * s, z,  // Bottom left
      x + 0.2 * s, y + 0.5 * s, z,  // Top right
      
      // Second triangle (right upper body)
      x + 0.2 * s, y + 0.5 * s, z,  // Top right
      x - 0.2 * s, y - 0.2 * s, z,  // Bottom left
      x + 0.2 * s, y - 0.2 * s, z   // Bottom right
    ]);
    this.drawTriangle(gl, upperBodyVertices.slice(0, 9), this.colors.bodyLight);
    this.drawTriangle(gl, upperBodyVertices.slice(9, 18), this.colors.bodyLight);
    
    // Center diamond - dark slate
    let diamondVertices = new Float32Array([
      // First triangle (upper diamond)
      x, y + 0.25 * s, z,           // Top point
      x - 0.12 * s, y, z,           // Left point
      x + 0.12 * s, y, z,           // Right point
      
      // Second triangle (lower diamond)
      x, y - 0.15 * s, z,           // Bottom point
      x - 0.12 * s, y, z,           // Left point
      x + 0.12 * s, y, z            // Right point
    ]);
    this.drawTriangle(gl, diamondVertices.slice(0, 9), this.colors.bodyDark);
    this.drawTriangle(gl, diamondVertices.slice(9, 18), this.colors.bodyDark);
    
    // Lower body - dark triangle pointing down
    let lowerBodyVertices = new Float32Array([
      x - 0.2 * s, y - 0.2 * s, z,  // Top left
      x + 0.2 * s, y - 0.2 * s, z,  // Top right
      x, y - 0.5 * s, z             // Bottom point
    ]);
    this.drawTriangle(gl, lowerBodyVertices, this.colors.bodyDark);
  }
  
  drawSideFins(gl, x, y, z, s) {
    // Left fin - dark gray
    let leftFinVertices = new Float32Array([
      x - 0.2 * s, y - 0.2 * s, z,   // Top right
      x - 0.4 * s, y - 0.4 * s, z,   // Left point
      x - 0.2 * s, y - 0.5 * s, z    // Bottom right
    ]);
    this.drawTriangle(gl, leftFinVertices, this.colors.bodyDark);
    
    // Right fin - dark gray
    let rightFinVertices = new Float32Array([
      x + 0.2 * s, y - 0.2 * s, z,   // Top left
      x + 0.4 * s, y - 0.4 * s, z,   // Right point
      x + 0.2 * s, y - 0.5 * s, z    // Bottom left
    ]);
    this.drawTriangle(gl, rightFinVertices, this.colors.bodyDark);
    
    // Left fin detail - purple
    let leftFinDetailVertices = new Float32Array([
      x - 0.2 * s, y - 0.25 * s, z,   // Top
      x - 0.3 * s, y - 0.4 * s, z,    // Left
      x - 0.2 * s, y - 0.5 * s, z     // Bottom
    ]);
    this.drawTriangle(gl, leftFinDetailVertices, this.colors.bodyLight);
    
    // Right fin detail - purple
    let rightFinDetailVertices = new Float32Array([
      x + 0.2 * s, y - 0.25 * s, z,   // Top
      x + 0.3 * s, y - 0.4 * s, z,    // Right
      x + 0.2 * s, y - 0.5 * s, z     // Bottom
    ]);
    this.drawTriangle(gl, rightFinDetailVertices, this.colors.bodyLight);
  }
  
  drawFlames(gl, x, y, z, s) {
    // Outer flames - red (left and right sides)
    let outerFlameVertices = new Float32Array([
      // Left outer flame
      x - 0.17 * s, y - 0.5 * s, z,  // Top
      x - 0.25 * s, y - 0.7 * s, z,  // Left point
      x - 0.05 * s, y - 0.5 * s, z,  // Right
      
      // Right outer flame
      x + 0.17 * s, y - 0.5 * s, z,  // Top
      x + 0.25 * s, y - 0.7 * s, z,  // Right point
      x + 0.05 * s, y - 0.5 * s, z   // Left
    ]);
    this.drawTriangle(gl, outerFlameVertices.slice(0, 9), this.colors.flame1);
    this.drawTriangle(gl, outerFlameVertices.slice(9, 18), this.colors.flame1);
    
    // Middle flames - orange (left and right of center)
    let middleFlameVertices = new Float32Array([
      // Left middle flame
      x - 0.1 * s, y - 0.5 * s, z,   // Top
      x - 0.15 * s, y - 0.8 * s, z,  // Bottom point
      x, y - 0.5 * s, z,             // Right
      
      // Right middle flame
      x + 0.1 * s, y - 0.5 * s, z,   // Top
      x + 0.15 * s, y - 0.8 * s, z,  // Bottom point
      x, y - 0.5 * s, z              // Left
    ]);
    this.drawTriangle(gl, middleFlameVertices.slice(0, 9), this.colors.flame2);
    this.drawTriangle(gl, middleFlameVertices.slice(9, 18), this.colors.flame2);
    
    // Center flame - yellow (middle)
    let centerFlameVertices = new Float32Array([
      x - 0.05 * s, y - 0.5 * s, z,  // Left
      x, y - 0.9 * s, z,             // Bottom point
      x + 0.05 * s, y - 0.5 * s, z   // Right
    ]);
    this.drawTriangle(gl, centerFlameVertices, this.colors.flame3);
  }
  
  drawTriangle(gl, vertices, color) {
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    let a_Position = gl.getAttribLocation(gl.program, "a_Position");
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    
    let u_Color = gl.getUniformLocation(gl.program, "u_Color");
    let u_Size = gl.getUniformLocation(gl.program, "u_Size");
    
    gl.uniform3f(u_Color, color[0], color[1], color[2]);
    gl.uniform1f(u_Size, 1.0);
    
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

function createShape(x, y) {
  let position = [x, y, 0.0];
  
  switch(currentBrush.shapeType) {
    case ShapeType.POINT:
      return new Point(position);
    case ShapeType.TRIANGLE:
      return new Triangle(position);
    case ShapeType.SQUARE:
      return new Square(position);
    case ShapeType.CIRCLE:
      return new Circle(position);
    default:
      return new Point(position);
  }
}

function main() {
  let canvas = document.getElementById("webgl");

  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log("Failed to get WebGl Context.");
    return -1;
  }

  // Initialize shaders
  if (!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER)) {
    console.log("Failed to load/compile shaders");
    return -1;
  }

  // Initial draw
  draw();

  // Track last render time for performance optimization
  let lastRenderTime = 0;
  const RENDER_INTERVAL = 16; // Minimum time between renders (approx 60fps)

  // Click handler for single clicks
  canvas.addEventListener('click', function(ev) {
    let rect = ev.target.getBoundingClientRect();
    let x = ((ev.clientX - rect.left) - canvas.width/2)/(canvas.width/2);
    let y = (canvas.height/2 - (ev.clientY - rect.top))/(canvas.height/2);
    let newShape = createShape(x, y);
    shapesList.push(newShape);
    draw();
  });

  // Mouse move handler for continuous drawing
  canvas.addEventListener('mousemove', function(ev) {
    if (ev.buttons === 1) { // Check if left mouse button is held down
      let currentTime = performance.now();
      if (currentTime - lastRenderTime >= RENDER_INTERVAL) {
        let rect = ev.target.getBoundingClientRect();
        let x = ((ev.clientX - rect.left) - canvas.width/2)/(canvas.width/2);
        let y = (canvas.height/2 - (ev.clientY - rect.top))/(canvas.height/2);
        let newShape = createShape(x, y);
        shapesList.push(newShape);
        draw();
        lastRenderTime = currentTime;
      }
    }
  });

  // Shape selection buttons
  document.getElementById('triangleShape').addEventListener('click', function() {
    currentBrush.shapeType = ShapeType.TRIANGLE;
  });
  
  document.getElementById('squareShape').addEventListener('click', function() {
    currentBrush.shapeType = ShapeType.SQUARE;
  });
  
  document.getElementById('circleShape').addEventListener('click', function() {
    currentBrush.shapeType = ShapeType.CIRCLE;
  });

  // Event listeners for color and size controls
  document.getElementById('redS').addEventListener('mouseup', function() {
    currentBrush.color[0] = this.value / 20;
  });
  
  document.getElementById('greenS').addEventListener('mouseup', function() {
    currentBrush.color[1] = this.value / 20;
  });
  
  document.getElementById('blueS').addEventListener('mouseup', function() {
    currentBrush.color[2] = this.value / 20;
  });
  
  document.getElementById('shapeSize').addEventListener('mouseup', function() {
    currentBrush.size = this.value / 50;
  });

  document.getElementById('circleSegments').addEventListener('mouseup', function() {
    currentBrush.segments = parseInt(this.value);
  });

  document.getElementById('clearCanvas').addEventListener('click', function() {
    shapesList = [];
    draw();
  });

  // Add rocket ship button handler
  document.getElementById('addRocket').addEventListener('click', function() {
    let rocketShip = new RocketShip([0.0, 0.0, 0.0], 1.0);
    shapesList.push(rocketShip);
    draw();
  });
}

function draw() {
  // Clear canvas
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Render each shape in the list
  shapesList.forEach(shape => shape.render(gl));
}
