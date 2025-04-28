// Panda.js - 3D Panda drawing class
// This class handles all the rendering operations for a 3D panda model

class Panda {
  constructor() {
    // Define colors used across the panda model based on Minecraft reference
    this.whiteColor = [0.95, 0.95, 0.95];     // Pure white for main body
    this.blackColor = [0.08, 0.08, 0.08];     // Pure black for patches and legs
    this.darkGrayColor = [0.3, 0.3, 0.3];     // Dark gray for shading
    this.lightGrayColor = [0.7, 0.7, 0.7];    // Light gray for muzzle area
    this.mediumGrayColor = [0.5, 0.5, 0.5];   // Medium gray for details
    this.pinkColor = [0.95, 0.5, 0.65];       // Pink for tongue
    
    // Poke animation variables
    this.isPoking = false;
    this.isFlipped = false;
    this.pokeStartTime = 0;
    this.pokeDuration = 1000; // Animation lasts 1 second for transition
    
    // Buffer cache for performance optimization
    this.bufferCache = {
      cube: null,
      initialized: false
    };
  }
  
  // Initialize shared buffers for all cubes
  initBuffers(gl) {
    if (this.bufferCache.initialized) return;
    
    // Create a standard cube for reference
    const cube = new Cube(0, 0, 0, 1.0, [1, 1, 1]);
    
    // Create and store vertex buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube.vertices, gl.STATIC_DRAW);
    
    // Create and store index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);
    
    // Create and store normal buffer
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cube.normals, gl.STATIC_DRAW);
    
    // Store buffers in cache
    this.bufferCache = {
      vertices: vertexBuffer,
      indices: indexBuffer,
      normals: normalBuffer,
      initialized: true
    };
  }

  // Toggle the poke animation
  startPokeAnimation() {
    this.isPoking = true;
    this.pokeStartTime = Date.now();
    // Toggle the flipped state
    this.isFlipped = !this.isFlipped;
  }

  // Main render function to draw the entire panda
  render(gl, parentMatrix, jointAngle1, jointAngle2, headAngle) {
    // Initialize buffers if not already done
    this.initBuffers(gl);
    
    // Store the color uniform location
    const colorLocation = gl.getUniformLocation(gl.program, "u_Color");
    
    // Check if poke animation is active
    if (this.isPoking) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.pokeStartTime;
      
      if (elapsedTime >= this.pokeDuration) {
        // Animation transition is done, but maintain flipped state
        this.isPoking = false;
        
        // If flipped, draw in the flipped position
        if (this.isFlipped) {
          this.drawFlippedPanda(gl, parentMatrix, colorLocation, headAngle, jointAngle1, jointAngle2);
          return;
        }
      } else {
        // Calculate animation progress (0 to 1)
        const progress = elapsedTime / this.pokeDuration;
        
        // If we're flipping back to normal
        if (!this.isFlipped) {
          // Reverse the progress to go from flipped to normal
          this.drawPokeAnimation(gl, parentMatrix, colorLocation, 1 - progress, headAngle);
        } else {
          // Normal flipping animation
          this.drawPokeAnimation(gl, parentMatrix, colorLocation, progress, headAngle);
        }
        return;
      }
    } else if (this.isFlipped) {
      // Maintain the flipped state even when not animating
      this.drawFlippedPanda(gl, parentMatrix, colorLocation, headAngle, jointAngle1, jointAngle2);
      return;
    }
    
    // Draw the panda's body parts with normal animations
    this.drawBody(gl, parentMatrix, colorLocation);
    this.drawHead(gl, parentMatrix, colorLocation, headAngle);
    this.drawLegs(gl, parentMatrix, colorLocation, jointAngle1, jointAngle2);
  }

  // Draw the fully flipped panda (static position)
  drawFlippedPanda(gl, parentMatrix, colorLocation, headAngle, jointAngle1, jointAngle2) {
    const pokeMatrix = new Matrix4(parentMatrix);
    
    // Position the flipped panda
    pokeMatrix.translate(0, 0.3, 0); // Lift slightly for better visibility
    
    // Add a continuous small rocking animation on X axis when flipped
    const currentTime = Date.now();
    const rockingAngle = Math.sin(currentTime * 0.002) * 10; // Small 10-degree rocking
    
    // First rotate on X axis for the rocking motion, then do the flip on Z axis
    pokeMatrix.rotate(rockingAngle, 1, 0, 0); // Small X-axis rotation
    pokeMatrix.rotate(180, 0, 0, 1); // Full 180 degree rotation (upside down)
    
    // Draw all panda parts in the flipped position
    this.drawBody(gl, pokeMatrix, colorLocation);
    this.drawHead(gl, pokeMatrix, colorLocation, headAngle);
    
    // Use the joint angles passed in for walking animation, but modify them for the flipped state
    if (typeof jointAngle1 === 'number' && typeof jointAngle2 === 'number') {
      // When flipped, add a kicking motion to the legs
      // Make the legs move more energetically when upside down
      
      // Use a different frequency for the leg movement when flipped
      const flippedFrequency = 0.004;
      const extraKick = Math.sin(currentTime * flippedFrequency) * 30;
      
      // Apply the extra kick movement to the standard angles
      // Left and right legs move in alternating pattern with extra amplitude
      const leftLegAngle = -jointAngle1 + 90 + extraKick;
      const rightLegAngle = -jointAngle2 + 90 - extraKick;
      
      this.drawLegs(gl, pokeMatrix, colorLocation, leftLegAngle, rightLegAngle);
    } else {
      // Fallback to static pose if no animation angles provided
      this.drawLegs(gl, pokeMatrix, colorLocation, 90, 90);
    }
  }

  // Draw the poke animation (panda rolling on its back)
  drawPokeAnimation(gl, parentMatrix, colorLocation, progress, headAngle) {
    // Create a copy of the parent matrix
    const pokeMatrix = new Matrix4(parentMatrix);
    
    // Simplified animation: just flip the panda upside down
    // progress goes from 0 to 1 (normal to upside down)
    
    // Calculate the flip angle based on progress
    const flipAngle = progress * 180; // Rotate from 0 to 180 degrees
    
    pokeMatrix.translate(0, 0.3, 0); // Lift slightly for better visibility
    pokeMatrix.rotate(flipAngle, 0, 0, 1); // Rotate around z-axis (flip)
    
    // Draw all panda parts in the flipped position
    this.drawBody(gl, pokeMatrix, colorLocation);
    this.drawHead(gl, pokeMatrix, colorLocation, headAngle);
    
    // Make legs stick out straight based on progress
    const legAngle = progress * 90; // Gradually straighten legs during flip
    this.drawLegs(gl, pokeMatrix, colorLocation, legAngle, legAngle);
  }

  // Optimized renderCube method that uses shared buffers
  renderCube(gl, modelMatrix, color, colorLocation) {
    // Set color uniform
    gl.uniform3fv(colorLocation, color);
    
    // Set model matrix uniform
    const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    
    // Bind pre-stored vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferCache.vertices);
    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);
    
    // Bind pre-stored normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferCache.normals);
    const a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
    
    // Bind pre-stored index buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferCache.indices);
    
    // Draw the cube
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  }

  // Draw the panda's body
  drawBody(gl, parentMatrix, colorLocation) {
    // Main body - white
    const bodyMatrix = new Matrix4(parentMatrix);
    bodyMatrix.translate(0, 0.3, 0);
    bodyMatrix.scale(1.1, 1.2, 1.8);
    
    this.renderCube(gl, bodyMatrix, this.whiteColor, colorLocation);

    // Black left side vertical stripe - slightly protruding from body
    const leftStripeMatrix = new Matrix4(parentMatrix);
    leftStripeMatrix.translate(-0.53, 0.3, 0); 
    leftStripeMatrix.scale(0.15, 1.2, 0.7); // Thinner stripe with less protrusion
    
    this.renderCube(gl, leftStripeMatrix, this.blackColor, colorLocation);
    
    // Black right side vertical stripe - slightly protruding from body
    const rightStripeMatrix = new Matrix4(parentMatrix);
    rightStripeMatrix.translate(0.53, 0.3, 0);
    rightStripeMatrix.scale(0.15, 1.2, 0.7); // Thinner stripe with less protrusion
    
    this.renderCube(gl, rightStripeMatrix, this.blackColor, colorLocation);
    
    // Black top horizontal stripe - matching protrusion of side stripes
    const topStripeMatrix = new Matrix4(parentMatrix);
    topStripeMatrix.translate(0, 0.86, 0);
    topStripeMatrix.scale(1.1, 0.15, 0.7); // Reduced width to match side protrusion
    
    this.renderCube(gl, topStripeMatrix, this.blackColor, colorLocation);
    
    // Add subtle black side panels flush with body to prevent z-fighting
    const leftPanelMatrix = new Matrix4(parentMatrix);
    leftPanelMatrix.translate(-0.56, 0.3, 0); 
    leftPanelMatrix.scale(0.01, 1.2, 0.7); // Very thin panel flush with body side
    
    this.renderCube(gl, leftPanelMatrix, this.blackColor, colorLocation);
    
    // Right side panel
    const rightPanelMatrix = new Matrix4(parentMatrix);
    rightPanelMatrix.translate(0.56, 0.3, 0);
    rightPanelMatrix.scale(0.01, 1.2, 0.7); // Very thin panel flush with body side
    
    this.renderCube(gl, rightPanelMatrix, this.blackColor, colorLocation);
    
    // Top panel
    const topPanelMatrix = new Matrix4(parentMatrix);
    topPanelMatrix.translate(0, 0.91, 0);
    topPanelMatrix.scale(1.1, 0.01, 0.7); // Very thin panel flush with body top
    
    this.renderCube(gl, topPanelMatrix, this.blackColor, colorLocation);
  }

  // Draw the panda's head
  drawHead(gl, parentMatrix, colorLocation, headAngle) {
    // Head - white base with turn animation
    const headMatrix = new Matrix4(parentMatrix);
    headMatrix.translate(0, 0.1, 1.0);
    headMatrix.rotate(headAngle, 0, 1, 0); // Add head turn around Y axis
    headMatrix.scale(1.0, 0.8, 0.8);
    
    this.renderCube(gl, headMatrix, this.whiteColor, colorLocation);
    
    // ======= LEFT EYE - Pixelated Minecraft style =======
    gl.uniform3fv(colorLocation, this.blackColor);
    
    // Create a matrix for pixel positioning - using a consistent scale for all pixels
    const pixelSize = 0.1; // Size of each "pixel" cube
    const baseZ = 0.51; // Z-position for all pixels (slightly in front of face)
    
    // LEFT EYE BLACK PIXELS - exact pattern from reference image

    // Row 1 (top row)
    this.renderPixel(gl, headMatrix, -0.45, 0.3, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.35, 0.3, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.25, 0.3, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // Row 2
    this.renderPixel(gl, headMatrix, -0.45, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.35, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.25, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.15, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // Row 3
    this.renderPixel(gl, headMatrix, -0.45, 0.1, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.15, 0.1, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // Row 4
    this.renderPixel(gl, headMatrix, -0.45, 0.0, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.35, 0.0, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, -0.25, 0.0, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // LEFT EYE GRAY PIXEL - placed at the inner part of the eye (right side)
    this.renderPixel(gl, headMatrix, -0.25, 0.1, baseZ + 0.01, pixelSize, this.mediumGrayColor, colorLocation);
    
    // LEFT EYE WHITE PIXEL - placed at the outer part of the eye (left side)
    this.renderPixel(gl, headMatrix, -0.35, 0.1, baseZ + 0.01, pixelSize, this.whiteColor, colorLocation);
    
    // ======= RIGHT EYE - Pixelated Minecraft style =======
    
    // RIGHT EYE BLACK PIXELS - exact pattern from reference image
    
    // Row 1 (top row)
    this.renderPixel(gl, headMatrix, 0.25, 0.3, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.35, 0.3, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.45, 0.3, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // Row 2
    this.renderPixel(gl, headMatrix, 0.15, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.25, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.35, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.45, 0.2, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // Row 3
    this.renderPixel(gl, headMatrix, 0.15, 0.1, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.45, 0.1, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // Row 4
    this.renderPixel(gl, headMatrix, 0.25, 0.0, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.35, 0.0, baseZ, pixelSize, this.blackColor, colorLocation);
    this.renderPixel(gl, headMatrix, 0.45, 0.0, baseZ, pixelSize, this.blackColor, colorLocation);
    
    // RIGHT EYE GRAY PIXEL - placed at the correct spot in the reference image
    this.renderPixel(gl, headMatrix, 0.25, 0.1, baseZ + 0.01, pixelSize, this.mediumGrayColor, colorLocation);
    
    // RIGHT EYE WHITE PIXEL - placed to the right of the gray pixel
    this.renderPixel(gl, headMatrix, 0.35, 0.1, baseZ + 0.01, pixelSize, this.whiteColor, colorLocation);
    
    // Ears - static position
    // Left ear
    const leftEarMatrix = new Matrix4(headMatrix);
    leftEarMatrix.translate(-0.5, 0.6, 0.0);
    leftEarMatrix.scale(0.35, 0.45, 0.15);
    
    this.renderCube(gl, leftEarMatrix, this.blackColor, colorLocation);
    
    // Right ear
    const rightEarMatrix = new Matrix4(headMatrix);
    rightEarMatrix.translate(0.5, 0.6, 0.0);
    rightEarMatrix.scale(0.35, 0.45, 0.15);
    
    this.renderCube(gl, rightEarMatrix, this.blackColor, colorLocation);
    
    // Muzzle area - white in Minecraft panda
    const muzzleMatrix = new Matrix4(headMatrix);
    muzzleMatrix.translate(0, -0.15, 0.51);
    muzzleMatrix.scale(0.4, 0.2, 0.1);
    
    this.renderCube(gl, muzzleMatrix, this.whiteColor, colorLocation);
    
    // Black square nose (more prominent)
    const noseMatrix = new Matrix4(headMatrix);
    noseMatrix.translate(0, -0.07, 0.52);
    noseMatrix.scale(0.3, 0.15, 0.1);
    
    this.renderCube(gl, noseMatrix, this.blackColor, colorLocation);
    
    // Pink tongue underneath (visible beneath the nose) - Minecraft style
    const tongueMatrix = new Matrix4(headMatrix);
    tongueMatrix.translate(0, -0.25, 0.52);
    tongueMatrix.scale(0.2, 0.15, 0.1);
    
    this.renderCube(gl, tongueMatrix, this.pinkColor, colorLocation);
  }

  // Helper method to render a single pixel (cube) for the pixelated details
  renderPixel(gl, parentMatrix, x, y, z, size, color, colorLocation) {
    const pixelMatrix = new Matrix4(parentMatrix);
    pixelMatrix.translate(x, y, z);
    pixelMatrix.scale(size, size, size/3); // Make pixels flatter like in the original
    
    this.renderCube(gl, pixelMatrix, color, colorLocation);
  }

  // Draw the panda's legs with joint animation
  drawLegs(gl, parentMatrix, colorLocation, jointAngle1, jointAngle2) {
    // Front legs (black)
    // Left front leg
    const leftFrontLegMatrix = new Matrix4(parentMatrix);
    leftFrontLegMatrix.translate(-0.3, -0.2, 0.6); // Higher pivot point
    leftFrontLegMatrix.rotate(-jointAngle1 * 0.8, 1, 0, 0); // Quick but less extreme rotation
    leftFrontLegMatrix.translate(0, -0.3, 0); // Offset to keep leg length but change pivot
    leftFrontLegMatrix.scale(0.4, 0.7, 0.4); // Slightly shorter to prevent protrusion
    
    this.renderCube(gl, leftFrontLegMatrix, this.blackColor, colorLocation);
    
    // Right front leg
    const rightFrontLegMatrix = new Matrix4(parentMatrix);
    rightFrontLegMatrix.translate(0.3, -0.2, 0.6); // Higher pivot point
    rightFrontLegMatrix.rotate(jointAngle2 * 0.8, 1, 0, 0); // Quick but less extreme rotation
    rightFrontLegMatrix.translate(0, -0.3, 0); // Offset to keep leg length but change pivot
    rightFrontLegMatrix.scale(0.4, 0.7, 0.4); // Slightly shorter to prevent protrusion
    
    this.renderCube(gl, rightFrontLegMatrix, this.blackColor, colorLocation);
    
    // Back legs (black)
    // Left back leg
    const leftBackLegMatrix = new Matrix4(parentMatrix);
    leftBackLegMatrix.translate(-0.3, -0.2, -0.6); // Higher pivot point
    leftBackLegMatrix.rotate(jointAngle2 * 0.8, 1, 0, 0); // Quick but less extreme rotation
    leftBackLegMatrix.translate(0, -0.3, 0); // Offset to keep leg length but change pivot
    leftBackLegMatrix.scale(0.4, 0.7, 0.4); // Slightly shorter to prevent protrusion
    
    this.renderCube(gl, leftBackLegMatrix, this.blackColor, colorLocation);
    
    // Right back leg
    const rightBackLegMatrix = new Matrix4(parentMatrix);
    rightBackLegMatrix.translate(0.3, -0.2, -0.6); // Higher pivot point 
    rightBackLegMatrix.rotate(-jointAngle1 * 0.8, 1, 0, 0); // Quick but less extreme rotation
    rightBackLegMatrix.translate(0, -0.3, 0); // Offset to keep leg length but change pivot
    rightBackLegMatrix.scale(0.4, 0.7, 0.4); // Slightly shorter to prevent protrusion
    
    this.renderCube(gl, rightBackLegMatrix, this.blackColor, colorLocation);
  }
} 