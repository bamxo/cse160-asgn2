// Triangle class
class Triangle {
  constructor(x, y, z, size = 0.5, color = [0.0, 1.0, 0.0]) {
    this.position = [x, y, z];
    this.size = size;
    this.color = color;
    this.vertices = this.generateVertices();
  }
  
  generateVertices() {
    const halfSize = this.size / 2;
    
    // Basic triangle centered at position
    return new Float32Array([
      // Vertex 1: Top
      this.position[0], this.position[1] + halfSize, this.position[2],
      // Vertex 2: Bottom Left
      this.position[0] - halfSize, this.position[1] - halfSize, this.position[2],
      // Vertex 3: Bottom Right
      this.position[0] + halfSize, this.position[1] - halfSize, this.position[2]
    ]);
  }
  
  render(gl, modelMatrix, colorLocation) {
    // Set color uniform
    gl.uniform3fv(colorLocation, this.color);
    
    // Create and bind buffer for vertex position
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    
    // Set position attribute
    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    
    // Set model matrix uniform
    const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    
    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
} 