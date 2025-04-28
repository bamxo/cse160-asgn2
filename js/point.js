// Point class
class Point {
  constructor(x, y, z, color = [1.0, 0.0, 0.0]) {
    this.position = [x, y, z];
    this.color = color;
  }
  
  render(gl, modelMatrix, colorLocation) {
    // Set color uniform
    gl.uniform3fv(colorLocation, this.color);
    
    // Create and bind buffer for vertex position
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    // Create a single point vertex
    const vertices = new Float32Array(this.position);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Set position attribute
    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    
    // Set model matrix uniform
    const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    
    // Draw the point
    gl.drawArrays(gl.POINTS, 0, 1);
  }
} 