// Model.js
// Alexander Bateman
// arbatema@ucsc.edu
// Notes to Grader:
// Resources used: Adapted most of it from the lab, but was getting errors with v/vt/vn stuff, asked Claude, it fixed it, (Lines 42-49) 
// but it also added 
//     const line = lines[i].trim();
//     const tokens = line.split(/\s+/);
// Which I  wouldn't have done, but I left it, I needed to get back to World.js. It said it was for more robust parsing for whitespace.



class Model {
  constructor(filePath) {
    this.filePath = filePath;
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.isFullyLoaded = false;
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.modelData = null;

    this.getFileContent();
  }

  async parseModel(fileContent) {
    const lines = fileContent.split("\n");
    const allVertices = [];
    const allNormals = [];
    const unpackedVerts = [];
    const unpackedNormals = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const tokens = line.split(/\s+/);

      if (tokens[0] === 'v') {
        allVertices.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
      } else if (tokens[0] === 'vn') {
        allNormals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
      } else if (tokens[0] === 'f') {
        // Handle triangles and quads
        const faceVerts = [];
        for (let j = 1; j < tokens.length; j++) {
          faceVerts.push(tokens[j]);
        }
        // Triangulate (fan triangulation for quads)
        for (let j = 1; j < faceVerts.length - 1; j++) {
          for (const face of [faceVerts[0], faceVerts[j], faceVerts[j+1]]) {
            // Handle v//vn and v/vt/vn formats
            const indices = face.split('/');
            const vertexIndex = (parseInt(indices[0]) - 1) * 3;
            const normalIndex = (parseInt(indices[indices.length - 1]) - 1) * 3;

            unpackedVerts.push(
              allVertices[vertexIndex],
              allVertices[vertexIndex + 1],
              allVertices[vertexIndex + 2]
            );
            unpackedNormals.push(
              allNormals[normalIndex],
              allNormals[normalIndex + 1],
              allNormals[normalIndex + 2]
            );
          }
        }
      }
    }

    this.modelData = {
      vertices: new Float32Array(unpackedVerts),
      normals: new Float32Array(unpackedNormals)
    };

    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.isFullyLoaded = true;
    console.log('Model loaded:', this.filePath, 'verts:', unpackedVerts.length / 3);
  }

  async getFileContent() {
    try {
      const response = await fetch(this.filePath);
      if (!response.ok) throw new Error(`Could not load "${this.filePath}"`);
      const fileContent = await response.text();
      await this.parseModel(fileContent);
    } catch (e) {
      console.error('Model load error:', e);
    }
  }

  render() {
    if (!this.isFullyLoaded) return;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.modelData.vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.modelData.normals, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    // Disable UV since OBJ doesn't use it
    gl.disableVertexAttribArray(a_UV);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_TexColorWeight, 0.0);
    gl.uniform1i(u_whichTexture, -1);


    let normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.drawArrays(gl.TRIANGLES, 0, this.modelData.vertices.length / 3);
  }
}