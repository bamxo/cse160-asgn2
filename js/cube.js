// Cube class
class Cube {
  constructor(x = 0, y = 0, z = 0, size = 1.0, color = [1.0, 0.5, 0.0]) {
    this.position = [x, y, z];
    this.size = size;
    this.color = color;
    
    // Create vertices data - 8 corners of the cube
    this.vertices = this.generateVertices();
    this.indices = this.generateIndices();
    this.normals = this.generateNormals();
  }
  
  generateVertices() {
    const halfSize = this.size / 2;
    
    // Define the 8 vertices of the cube
    return new Float32Array([
      // Front face
      -halfSize, -halfSize,  halfSize,  // Vertex 0
       halfSize, -halfSize,  halfSize,  // Vertex 1
       halfSize,  halfSize,  halfSize,  // Vertex 2
      -halfSize,  halfSize,  halfSize,  // Vertex 3
      // Back face
      -halfSize, -halfSize, -halfSize,  // Vertex 4
       halfSize, -halfSize, -halfSize,  // Vertex 5
       halfSize,  halfSize, -halfSize,  // Vertex 6
      -halfSize,  halfSize, -halfSize   // Vertex 7
    ]);
  }
  
  generateIndices() {
    // Define the 12 triangles of the cube (2 per face)
    return new Uint16Array([
      // Front face
      0, 1, 2,   0, 2, 3,
      // Right face
      1, 5, 6,   1, 6, 2,
      // Back face
      5, 4, 7,   5, 7, 6,
      // Left face
      4, 0, 3,   4, 3, 7,
      // Top face
      3, 2, 6,   3, 6, 7,
      // Bottom face
      4, 5, 1,   4, 1, 0
    ]);
  }
  
  generateNormals() {
    // Normals for each vertex (will be the same for vertices on the same face)
    return new Float32Array([
      // Front face normals
      0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
      // Back face normals
      0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
      // Top face normals
      0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
      // Bottom face normals
      0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
      // Right face normals
      1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
      // Left face normals
      -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
    ]);
  }
  
  // Legacy render method - now most rendering is handled by Panda.renderCube
  render(gl, modelMatrix, colorLocation) {
    // Set color uniform
    gl.uniform3fv(colorLocation, this.color);
    
    // Create and bind buffer for vertex positions
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    
    // Set position attribute
    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    
    // Create and bind buffer for indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    
    // If normal attribute is available, set up normals
    const a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    if (a_Normal !== -1) {
      const normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);
    }
    
    // Set model matrix uniform
    const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    
    // Apply position translation if needed
    if (this.position[0] !== 0 || this.position[1] !== 0 || this.position[2] !== 0) {
      const translatedMatrix = new Matrix4(modelMatrix);
      translatedMatrix.translate(this.position[0], this.position[1], this.position[2]);
      gl.uniformMatrix4fv(u_ModelMatrix, false, translatedMatrix.elements);
    }
    
    // Draw the cube
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }
  
  // Static factory method for easier creation
  static createCube(gl, x, y, z, size, color) {
    return new Cube(x, y, z, size, color);
  }
} 