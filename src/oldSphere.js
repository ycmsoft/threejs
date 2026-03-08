// Sphere.js
// Alexander Bateman
// arbatema@ucsc.edu
// Notes to Grader: 
// Resources used: Professors youtube videos, slight debugging with ChatGPT (drawArrays line, back and top vertices corrected)
class Sphere {
  constructor(){
    this.type = 'sphere';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.texWeight = 1.0;
    this.textureNum = -2;
    this.verts32 = new Float32Array([]);
  }


render() {
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_TexColorWeight, this.texWeight);
    gl.uniform1i(u_whichTexture, this.textureNum);

    
    let normalMatrix = new Matrix4();
    normalMatrix.setInverseOf(this.matrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);




    var d  = Math.PI / 25;
    var dd = Math.PI / 25;

    for (var t = 0; t < Math.PI; t += d) {
      for (var r = 0; r < (2 * Math.PI); r += d) {
        var p1 = [Math.sin(t)*Math.cos(r),       Math.sin(t)*Math.sin(r),       Math.cos(t)];
        var p2 = [Math.sin(t+dd)*Math.cos(r),     Math.sin(t+dd)*Math.sin(r),    Math.cos(t+dd)];
        var p3 = [Math.sin(t)*Math.cos(r+dd),     Math.sin(t)*Math.sin(r+dd),    Math.cos(t)];
        var p4 = [Math.sin(t+dd)*Math.cos(r+dd),  Math.sin(t+dd)*Math.sin(r+dd), Math.cos(t+dd)];

        var uv1 = [t/Math.PI,       r/(2*Math.PI)];
        var uv2 = [(t+dd)/Math.PI,  r/(2*Math.PI)];
        var uv3 = [t/Math.PI,       (r+dd)/(2*Math.PI)];
        var uv4 = [(t+dd)/Math.PI,  (r+dd)/(2*Math.PI)];

        var v = []; var uv = [];
        v = v.concat(p1); uv = uv.concat(uv1);
        v = v.concat(p2); uv = uv.concat(uv2);
        v = v.concat(p4); uv = uv.concat(uv4);
        // normals == vertices for unit sphere centered at origin
        drawTriangle3DUVNormal(v, uv, v);

        v = []; uv = [];
        v = v.concat(p1); uv = uv.concat(uv1);
        v = v.concat(p4); uv = uv.concat(uv4);
        v = v.concat(p3); uv = uv.concat(uv3);
        drawTriangle3DUVNormal(v, uv, v);
      }
    }
  }
}