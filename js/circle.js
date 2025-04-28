// Circle class
class Circle {
  constructor(x, y, z, radius = 0.5, segments = 32, color = [0.0, 0.0, 1.0]) {
    this.position = [x, y, z];
    this.radius = radius;
    this.segments = segments;
    this.color = color;
    this.vertices = this.generateVertices();
  }
  
  generateVertices() {
    const vertices = [];
    
    // Center vertex
    vertices.push(this.position[0]);
    vertices.push(this.position[1]);
    vertices.push(this.position[2]);
    
    // Generate vertices for the circle
    for (let i = 0; i <= this.segments; i++) {
      const angle = (i / this.segments) * Math.PI * 2;
      const x = this.position[0] + this.radius * Math.cos(angle);
      const y = this.position[1] + this.radius * Math.sin(angle);
      const z = this.position[2];
      
      vertices.push(x);
      vertices.push(y);
      vertices.push(z);
    }
    
    return new Float32Array(vertices);
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
    
    // Draw the circle using TRIANGLE_FAN
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.segments + 2);
  }
} 