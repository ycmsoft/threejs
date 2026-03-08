// Sphere.js
// Alexander Bateman
// arbatema@ucsc.edu
// Notes to Grader: 
// Resources used: Professors youtube videos. 
// At first did it without the buffer and got horrible frames, so did it with the buffer, modeled after Cube.js from last assignment.
class Sphere {
  constructor(){
    this.type = 'sphere';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.texWeight = 1.0;
    this.textureNum = -2;
  }

  static initBuffer(){
    if(Sphere._buffer) return;

    var d = Math.PI / 25;
    var dd = Math.PI / 25;
    var verts = [];

    for(var t = 0; t < Math.PI; t += d){
      for(var r = 0; r < (2 * Math.PI); r += d){
        var p1 = [Math.sin(t)*Math.cos(r),       Math.sin(t)*Math.sin(r),       Math.cos(t)];
        var p2 = [Math.sin(t+dd)*Math.cos(r),     Math.sin(t+dd)*Math.sin(r),    Math.cos(t+dd)];
        var p3 = [Math.sin(t)*Math.cos(r+dd),     Math.sin(t)*Math.sin(r+dd),    Math.cos(t)];
        var p4 = [Math.sin(t+dd)*Math.cos(r+dd),  Math.sin(t+dd)*Math.sin(r+dd), Math.cos(t+dd)];

        var uv1 = [t/Math.PI,       r/(2*Math.PI)];
        var uv2 = [(t+dd)/Math.PI,  r/(2*Math.PI)];
        var uv3 = [t/Math.PI,       (r+dd)/(2*Math.PI)];
        var uv4 = [(t+dd)/Math.PI,  (r+dd)/(2*Math.PI)];

        // Triangle 1: p1, p2, p4  (x,y,z, u,v, nx,ny,nz)
        verts = verts.concat(p1, uv1, p1);
        verts = verts.concat(p2, uv2, p2);
        verts = verts.concat(p4, uv4, p4);

        // Triangle 2: p1, p4, p3
        verts = verts.concat(p1, uv1, p1);
        verts = verts.concat(p4, uv4, p4);
        verts = verts.concat(p3, uv3, p3);
      }
    }

    Sphere._vertexCount = verts.length / 8;
    Sphere._FSIZE = 4;
    Sphere._buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere._buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  }

  render(){
    Sphere.initBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere._buffer);
    var stride = 8 * Sphere._FSIZE;

    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, stride, 3 * Sphere._FSIZE);
    gl.enableVertexAttribArray(a_UV);

    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, stride, 5 * Sphere._FSIZE);
    gl.enableVertexAttribArray(a_Normal);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_TexColorWeight, this.texWeight);
    gl.uniform1i(u_whichTexture, this.textureNum);

    let normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

    gl.drawArrays(gl.TRIANGLES, 0, Sphere._vertexCount);
  }
}