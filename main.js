// Thomas Milne-Jones
// tmlinejo
// 1396046
// prog4
// 05/29/2015
// main.js
// displays two copies of a 3D model from a coor and poly file with individual mouse interactivity
// left click: translate, middle click: scale, right click: rotate


/*
    rotate all points
    calculate vertex normals
    calculate diffuse lighting
    calculate specular lighting
    apply perspective
    draw points to buffer with triangles
    create event listener for left click to toggle lighting and rerender
    create event listener for right click to toggle perspective and rerender
*/

var inputCoor = SHARK_COORD
var inputPoly = SHARK_POLY

var viewDistance = 2
var eyeVector = normalize([0,0,1])
var lightSource = normalize([1,1,1])
var glossiness = 20


var xdim = 100
var ydim = 100
var xmin = -2
var xmax = 1
var ymin = -1.75
var ymax = 1.25


var Rmax = 100;
var dx = (xmax - xmin) / (xdim - 1);
var dy = (ymax - ymin) / (ydim - 1);
var sx = 200;
var sy = 200;
var sz = 200;

var canvas;
var gl;

var examineInterval
var lookInterval

var maxNumVertices  = 1044484;
var index = 0;
var sharkVertices = 15348;

var selectedShark = 0

var coordList = [[],[]];
var normalPointer = [[],[]];
var normalList = [[],[]];
var normalFinal = [[],[]];
var sharkLocation = [[.5,0,0],[-.5,0,0]];
var sharkRotation = [[0,0],[0,0]];


var vertexShaderSource = "\
    attribute vec4 vPosition;  \n\
    attribute vec4 vColor;      \n\
    varying vec4 fColor;         \n\
    void main(void)                \n\
    {                                  \n\
      gl_Position = vPosition; \n\
      fColor = vColor;            \n\
    }                                  \n\
";
var fragmentShaderSource = "\
    precision mediump float;    \n\
    varying vec4 fColor;         \n\
    void main(void)                \n\
    {                                  \n\
      gl_FragColor = fColor;    \n\
    }                                  \n\
";

var vBuffer;
var vPosition;
var cBuffer;
var vColor;

window.onload = function init() {

    var coor = inputCoor;
    var poly = inputPoly;

    canvas = document.getElementById( "gl-canvas" );
    
    gl = canvas.getContext("experimental-webgl");    // sets up gl
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );// shows the canvas on the screen
    gl.clearColor( 0.0, 0.5, 0.0, 1.0 );  // sets the default background color

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, vertexShaderSource, fragmentShaderSource );
    gl.useProgram( program ); // runs the shader program
    
    
    // vertex buffers
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 12*maxNumVertices, gl.STATIC_DRAW);
    
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16*maxNumVertices, gl.STATIC_DRAW);
    
    vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    // vertex buffers
    
    
    for(i=0; i<coor.length; i++) // rotate all points in coor file
        coor[i] = rotate(coor[i])
    
    for(i=0; i<coor.length; i++) // prepare normal gathering list
    {
        normalList[0].push([[0,0,0]]);
        normalList[1].push([[0,0,0]]);
    }
    
    for(i=0; i<poly.length; i++) // construct triangle fans from poly file
    {
        normalList[0][poly[i][1]-1].push(getNormal(coor[poly[i][1]-1], coor[poly[i][2]-1], coor[poly[i][3]-1])); // collect normals for all polygons connected to a point
        normalList[0][poly[i][2]-1].push(getNormal(coor[poly[i][2]-1], coor[poly[i][3]-1], coor[poly[i][1]-1]));
        normalList[1][poly[i][1]-1].push(getNormal(coor[poly[i][1]-1], coor[poly[i][2]-1], coor[poly[i][3]-1])); // collect normals for all polygons connected to a point
        normalList[1][poly[i][2]-1].push(getNormal(coor[poly[i][2]-1], coor[poly[i][3]-1], coor[poly[i][1]-1]));
        for(j=3; j<poly[i].length; j++)
        {
            coordList[0].push([coor[poly[i][1]-1][0]+.2, coor[poly[i][1]-1][1], coor[poly[i][1]-1][2]]); // store all points to read into buffer later
            coordList[0].push([coor[poly[i][j-1]-1][0]+.2, coor[poly[i][j-1]-1][1], coor[poly[i][j-1]-1][2]]);
            coordList[0].push([coor[poly[i][j]-1][0]+.2, coor[poly[i][j]-1][1], coor[poly[i][j]-1][2]]);
            coordList[1].push([coor[poly[i][1]-1][0]-.2, coor[poly[i][1]-1][1], coor[poly[i][1]-1][2]]); // store all points to read into buffer later
            coordList[1].push([coor[poly[i][j-1]-1][0]-.2, coor[poly[i][j-1]-1][1], coor[poly[i][j-1]-1][2]]);
            coordList[1].push([coor[poly[i][j]-1][0]-.2, coor[poly[i][j]-1][1], coor[poly[i][j]-1][2]]);
            normalPointer[0].push(poly[i][1]-1); // remember which normal to associate with the point
            normalPointer[0].push(poly[i][2]-1);
            normalPointer[0].push(poly[i][j]-1);
            normalPointer[1].push(poly[i][1]-1); // remember which normal to associate with the point
            normalPointer[1].push(poly[i][2]-1);
            normalPointer[1].push(poly[i][j]-1);
            normalList[0][poly[i][j]-1].push(getNormal(coor[poly[i][1]-1], coor[poly[i][j-1]-1], coor[poly[i][j]-1])); // collect normals for all polygons connected to a point
            normalList[1][poly[i][j]-1].push(getNormal(coor[poly[i][1]-1], coor[poly[i][j-1]-1], coor[poly[i][j]-1])); // collect normals for all polygons connected to a point
        }
    }
    
    for(i=0; i<normalList[0].length; i++) // for each point, assemble collected smooth shading normals
    {
        var temp = [0, 0, 0];
        for(j=0; j<normalList[0][i].length; j++) // for each polygon next to this point, there will be a normal in the subarray
            for(k=0; k<=2; k++) // for each coordinate of the normal, add it to the sum
                temp[k] +=normalList[0][i][j][k];
        normalFinal[0].push(normalize(temp));
    } // assemble smooth normals
    for(i=0; i<normalList[1].length; i++) // for each point, assemble collected smooth shading normals
    {
        var temp = [0, 0, 0];
        for(j=0; j<normalList[1][i].length; j++) // for each polygon next to this point, there will be a normal in the subarray
            for(k=0; k<=2; k++) // for each coordinate of the normal, add it to the sum
                temp[k] +=normalList[1][i][j][k];
        normalFinal[1].push(normalize(temp));
    } // assemble smooth normals
    /*
    sharkVertices = coordList[0].length // number of vertices per shark
    coordList[1] = coordList[0]; // load values for second shark
    normalPointer[1] = normalPointer[0];
    normalFinal[1] = normalFinal[0];
    sharkLocation[0][0] += 0.5
    sharkLocation[1][0] -= 0.5
    
    */
    rerender(); // render inital user view
    
    
    var box = canvas.getBoundingClientRect();
    var dragging = false
    var rotating = false
    var scaling = false
    var prevx, prevy
    var modeFlag = 0
    
    canvas.addEventListener("contextmenu", function(event) { event.preventDefault();}); // prevent right click menu
    canvas.addEventListener("mousewheel", function(event) { selectedShark = (selectedShark+1)%2}); // switch active shark
    canvas.addEventListener("DOMMouseScroll", function(event) { selectedShark = (selectedShark+1)%2}); // switch active shark (firefox)
         
    canvas.addEventListener("mousedown", function(event)
    {
        if(event.button === 0)
            dragging = true
        if(event.button === 1)
            scaling = true
        if(event.button === 2)
            rotating = true
        prevx = event.clientX
        prevy = event.clientY
    } );
    canvas.addEventListener("mousemove", function (event2)
    {
        var movex = (event.clientX - prevx) / canvas.width
        var movey = (event.clientY - prevy) / canvas.height

        if(modeFlag == 0) // viewer mode
        {
            var sLoc = getCenter(coordList[selectedShark])
            if(dragging) // left mouse to drag
            {
                for(index=0; index<coordList[0].length; index++)
                {
                    coordList[selectedShark][index][0] += movex
                    coordList[selectedShark][index][1] -= movey
                }
                sharkLocation[selectedShark][0] += movex
                sharkLocation[selectedShark][1] -= movey
                rerender(true, true)
            }
            if(scaling) // middle mouse to scale
            {
                distance = Math.sqrt(Math.pow(movex, 2) + Math.pow(movey, 2))
                if(Math.sqrt(Math.pow(sharkLocation[selectedShark][0] - event.clientX,2) + Math.pow(sharkLocation[selectedShark][1] - event.clientY,2)) > Math.sqrt(Math.pow(sharkLocation[selectedShark][0] - prevx,2) + Math.pow(sharkLocation[selectedShark][1] - prevy,2)))
                    distance = -distance
                if(distance!=0 && Math.abs(distance) < .5)
                {
                    for(index=0; index<coordList[selectedShark].length; index++)
                    {
                        coordList[selectedShark][index][0] -= sLoc[0]
                        coordList[selectedShark][index][1] -= sLoc[1]
                        coordList[selectedShark][index][0] *= (1 - distance)
                        coordList[selectedShark][index][1] *= (1 - distance)
                        coordList[selectedShark][index][2] *= (1 - distance)
                        coordList[selectedShark][index][0] += sLoc[0]
                        coordList[selectedShark][index][1] += sLoc[1]
                    }
                }
                rerender(true, true)
            }
            if(rotating) // right mouse to rotate
            {
                var directionVector = normalize([movex, movey])
                for(index=0; index<coordList[0].length; index++)
                {
                    coordList[selectedShark][index][0] -= sLoc[0]
                    coordList[selectedShark][index][1] -= sLoc[1]
                    coordList[selectedShark][index] = rotateY(coordList[selectedShark][index], movex*5)
                    coordList[selectedShark][index] = rotateX(coordList[selectedShark][index], movey*5)
                    coordList[selectedShark][index][0] += sLoc[0]
                    coordList[selectedShark][index][1] += sLoc[1]
                }
                sharkRotation[selectedShark][0] += Math.asin(directionVector[1])
                sharkRotation[selectedShark][1] += length([movex, movey])
                rerender(true, true)
            }
        }
        else // camera mode
        {
            if(dragging) // left mouse to pan
            {
                for(index=0; index<coordList[0].length; index++)
                {
                    coordList[0][index][0] -= movex
                    coordList[0][index][1] += movey
                    coordList[1][index][0] -= movex
                    coordList[1][index][1] += movey
                }
                rerender(true, true)
            }
            if(scaling) // middle mouse to zoom
            {
                distance = Math.sqrt(Math.pow(movex, 2) + Math.pow(movey, 2))
                if(Math.sqrt(Math.pow(sharkLocation[selectedShark][0] - event.clientX,2) + Math.pow(sharkLocation[selectedShark][1] - event.clientY,2)) > Math.sqrt(Math.pow(sharkLocation[selectedShark][0] - prevx,2) + Math.pow(sharkLocation[selectedShark][1] - prevy,2)))
                    distance = -distance
                if(distance!=0 && Math.abs(distance) < .5)
                {
                    for(index=0; index<coordList[selectedShark].length; index++)
                    {
                        coordList[0][index][0] *= (1 - distance)
                        coordList[0][index][1] *= (1 - distance)
                        coordList[0][index][2] *= (1 - distance)
                        coordList[1][index][0] *= (1 - distance)
                        coordList[1][index][1] *= (1 - distance)
                        coordList[1][index][2] *= (1 - distance)
                    }
                }
                rerender(true, true)
            }
        }
        prevx = event.clientX
        prevy = event.clientY
    });
    canvas.addEventListener("mouseup", function(event3){
        dragging = false
        scaling = false
        rotating = false
    });
    window.addEventListener("keydown", function(event)
    {
        if(event.keyCode === 80) // press P to examine
            examineInterval = setInterval(examine(), 100)
        if(event.keyCode === 81) // press Q to look around
            lookInterval = setInterval(lookAround(), 100)
        if(event.keyCode === 67) // press C for camera mode
            modeFlag = 1
        if(event.keyCode === 86) // press V for viewer mode
            modeFlag = 0
    });
    window.addEventListener("keyup", function(event)
    {
        if(event.keyCode === 80) // release P to stop examining
            window.clearInterval(examineInterval)
        if(event.keyCode === 81) // press Q to look around
            window.clearInterval(lookInterval)
    });
} // main







function examine()
{
    for(index=0; index<coordList[0].length; index++)
    {
        coordList[0][index] = rotateY(coordList[0][index], Math.PI/36)
        coordList[1][index] = rotateY(coordList[1][index], Math.PI/36)
    }
    rerender(true, true)
}

function lookAround()
{
    for(index=0; index<coordList[0].length; index++)
    {
        coordList[0][index] = rotateZ(coordList[0][index], Math.PI/36)
        coordList[1][index] = rotateZ(coordList[1][index], Math.PI/36)
    }
    rerender(true, true)
}

function getCenter(pointList)
{
    var temp = [0,0,0]
    for(var i=0; i<pointList.length; i++)
    {
        temp[0]+=pointList[i][0]
        temp[1]+=pointList[i][1]
        temp[2]+=pointList[i][2]
    }
    temp[0] /= pointList.length
    temp[1] /= pointList.length
    temp[2] /= pointList.length

    return temp
}

function getDistance(point)
{
    var test = [0,0,startDistance]
    var sum = 0
    for(var i=0; i<point.length; i++)
    {
        sum+=Math.pow(point[i] - playerPosition[i], 2)
    }
    return Math.sqrt(sum)
}

function translate(point, translation)
{
    output = []
    for(i=0; i<point.length; i++)
        output.push(point[i] + translation[i])
    return output
}

function scale(point, factor)
{
    var output = []
    for(var i=0; i<3; i++)
        output.push(point[i] * factor)
    return output
}

function rotateX(point, angle)
{
    var x = point[0]
    var y = point[1]
    var z = point[2]
    var vx = x
    var vy = (Math.cos(angle) * y) - (Math.sin(angle) * z)
    var vz = (Math.sin(angle) * y) + (Math.cos(angle) * z)
    return [vx, vy, vz]
}
function rotateY(point, angle)
{
    var x = point[0]
    var y = point[1]
    var z = point[2]
    var vx = (Math.cos(angle) * x) + (Math.sin(angle) * z)
    var vy = y
    var vz = -(Math.sin(angle) * x) + (Math.cos(angle) * z)
    return [vx, vy, vz]
}
function rotateZ(point, angle)
{
    var x = point[0]
    var y = point[1]
    var z = point[2]
    var vx = (Math.cos(angle) * x) - (Math.sin(angle) * y)
    var vy = (Math.sin(angle) * x) + (Math.cos(angle) * y)
    var vz = z
    return [vx, vy, vz]
}

function rerender(smoo, pers) // check smooth/flat and perspective/ortho and then load triangles and render
{
    index = 0
    for(i=0; i<coordList[0].length; i+=3)
    {
        var theNormal = getNormal(coordList[0][i], coordList[0][i+1], coordList[0][i+2])
        nextColor = getFlatColor(theNormal) // get smooth shading colors if smooth flag is on
        
        if (dot(theNormal, [0,0,1]) >= 0) // only render triangles facing the camera
        {
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
            gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(perspect(coordList[0][i])));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(nextColor));
            index++;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
            gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(perspect(coordList[0][i+1])));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(nextColor));
            index++;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
            gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(perspect(coordList[0][i+2])));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(nextColor));
            index++;
        }
    }
    for(i=0; i<coordList[1].length; i+=3)
    {
        var theNormal = getNormal(coordList[1][i], coordList[1][i+1], coordList[1][i+2])
        nextColor = getFlatColor(theNormal) // get smooth shading colors if smooth flag is on
        
        if (dot(theNormal, [0,0,1]) >= 0) // only render triangles facing the camera
        {
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
            gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(perspect(coordList[1][i])));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(nextColor));
            index++;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
            gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(perspect(coordList[1][i+1])));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(nextColor));
            index++;
            gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
            gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten(perspect(coordList[1][i+2])));
            gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
            gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(nextColor));
            index++;
        }
    }
    /* debugging to show active shark
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
    gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten([sharkLocation[selectedShark][0] - .1, sharkLocation[selectedShark][1] - .05, 0]));
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(vec4(0.3, 0.2, 0.6, 1.0)));
    index++;
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
    gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten([sharkLocation[selectedShark][0] + .1, sharkLocation[selectedShark][1] - .05, 0]));
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(vec4(0.3, 0.2, 0.6, 1.0)));
    index++;
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);  // load triangles into buffer
    gl.bufferSubData(gl.ARRAY_BUFFER, 12*index, flatten([sharkLocation[selectedShark][0], sharkLocation[selectedShark][1] + .1, 0]));
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer); 
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*index, flatten(vec4(0.3, 0.2, 0.6, 1.0)));
    index++;*/
    render();
} // rerender

function getColor(normal) // calculates specular and smooth shading
{
    var halfwayVector = normalize([lightSource[0] + eyeVector[0], lightSource[1] + eyeVector[1], lightSource[2] + eyeVector[2]])
    var diffuse = 1*1*dot(normal, lightSource)
    var specular = 1*Math.pow(dot(normal, halfwayVector), glossiness)
    return vec4(diffuse+specular, diffuse+specular, diffuse+specular, 1.0)
} // getColor

function getFlatColor(normal) // calculates flat shading
{
    var diffuse = 1*1*dot(normal, lightSource)
    return vec4(diffuse, diffuse, diffuse, 1.0)
} // getFlatColor


function getNormal(pA, pB, pC) // calculates the normal of a given triangle
{
    var edge1 = [pB[0] - pA[0], pB[1] - pA[1], pB[2] - pA[2]];
    var edge2 = [pC[0] - pA[0], pC[1] - pA[1], pC[2] - pA[2]];
    output = normalize(cross(edge1, edge2));
    return output
} // getNormal

function rotate(point) // rotate to viewport
{
    var x = point[0]/sx; // scaling
    var y = point[1]/sy;
    var z = point[2]/sz;
    var vx = Math.sqrt(1/2)*(x+z);  // rotating to viewport
    var vy = Math.sqrt(1/6)*((2*y)+x-z);
    var vz = Math.sqrt(1/3)*(-x+y+z);
    return vec3(vx, vy, vz)
} // rotate

function perspect(point) // verbing things is fun
{
    var x = point[0]
    var y = point[1]
    var z = point[2]
    distance = Math.sqrt(Math.pow(x-(eyeVector[0]*viewDistance), 2) + Math.pow(y-(eyeVector[1]*viewDistance), 2) + Math.pow(z-(eyeVector[2]*viewDistance), 2))
    x = x * distance
    y = y * distance
    z = z * distance
    return [x, y, z]
} // perspect


function render() // draws stuff on the screen
{
    gl.clearDepth(0.0)
    gl.depthFunc(gl.GREATER)
    gl.enable(gl.DEPTH_TEST)
    gl.clear( gl.COLOR_BUFFER_BIT |gl.DEPTH_BUFFER_BIT ); // colors the background
    gl.drawArrays( gl.TRIANGLES, 0, index ); // draws the lines
} // render
