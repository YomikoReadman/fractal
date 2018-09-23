var canvas, gl, vertex_position, quad_buffer;
var uniform_zoom, uniform_offset;
var zoom = 2.0, off_x = -0.5, off_y = 0.0;
var iter_count = 100;
var x, y;

var posX, posY;
var palette_texture;
var sampler_uniform;

function draw()
{
	gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, palette_texture);
    gl.uniform1i(sampler_uniform, 0);
    
	gl.uniform2f(uniform_offset, off_x, off_y);
	gl.uniform1f(uniform_zoom, zoom);
	gl.bindBuffer(gl.ARRAY_BUFFER, quad_buffer);
	gl.vertexAttribPointer(vertex_position, 2, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function compile()
{
	var vertex_shader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertex_shader, document.getElementById("vertex-shader").text);
	gl.compileShader(vertex_shader);
	if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS)) {
		alert("vertex shader:\n" + gl.getShaderInfoLog(vertex_shader));
		return;
	}
	var fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
	var source = "precision highp float;\n";
    source += document.getElementById("sane-code").text;
    source += document.getElementById("argb-linear").text;
	source += document.getElementById("fragment-shader").text.replace("MAX_ITER", $("#iterations").val());
	gl.shaderSource(fragment_shader, source);
	gl.compileShader(fragment_shader);
	if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS)) {
		alert("fragment shader:\n" + gl.getShaderInfoLog(fragment_shader));
		return;
	}
	var program = gl.createProgram();
	gl.attachShader(program, vertex_shader);
	gl.attachShader(program, fragment_shader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		alert("linker error:\n" + gl.getProgramInfoLog(program));
		return;
	}
	gl.useProgram(program);
	vertex_position = gl.getAttribLocation(program, "vertex_position");
	gl.enableVertexAttribArray(vertex_position);
	uniform_offset = gl.getUniformLocation(program, "offset");
	uniform_zoom = gl.getUniformLocation(program, "zoom");
    iter_count = gl.getUniformLocation(program, "iterations");
    sampler_uniform = gl.getUniformLocation(program, "uSampler");
}

function init_textures()
{
    palette_texture = gl.createTexture();
    palette_texture.image = new Image();
    palette_texture.image.onload = function()
	{
		gl.bindTexture(gl.TEXTURE_2D, palette_texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, palette_texture.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null); //unbind
	}

    palette_texture.image = ""; // FOR LOCALHOST
    palette_texture.image.src = "palette.png";
}

function start()
{
	canvas = document.getElementById("canvas");
	gl = canvas.getContext("webgl");
	if (!gl)
		gl = canvas.getContext("experimental-webgl");
	if (!gl) {
		alert("could not get webgl context");
		return;
	}
    
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	quad_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quad_buffer);
	var vertices = [ 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0 ];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
    init_textures();
	compile();
	draw();
    
    canvas.addEventListener("mousemove", function() {
        x = 2.0 * (event.pageX - canvas.offsetLeft) / canvas.width - 1.0;
        y = 1.0 - 2.0 * (event.pageY - canvas.offsetTop) / canvas.height;
    }, false);
    
    $("#zoomOutput").val( 1 / zoom);
    $("#centerOffsetXOutput").val(off_x);
    $("#centerOffsetYOutput").val(off_y);
}

$(function() { 
    start();
    
    var wnd = $(window);
    var canvas = $("#canvas");
    
    document.oncontextmenu = function() {return false;};
   
    
    $('#canvas').mousewheel(function(event) {
        off_x += x * zoom;
        off_y += y * zoom;
        if (event.deltaY > 0)
            zoom /= 2.0;
        else
            zoom *= 2.0;
        draw();

        $("#zoomOutput").val(1 / zoom);
        $("#centerOffsetXOutput").val(off_x);
        $("#centerOffsetYOutput").val(off_y);
    });
   
    
    wnd.resize(function(e){
        canvas.height(wnd.height());
        
        var aspectRatio = 1.;
        var ww = wnd.height() * aspectRatio
        canvas.width(ww);
        
        canvas.css('margin-left', (wnd.width() / 2 - ww / 2)+'px');
        
        gl.viewportWidth = canvas.width();
        gl.viewportHeight = canvas.height();
        
        draw();
    }).trigger('resize');
    
    $("#reset_zoom").click(function() {
        zoom = 2.0;
        off_x = -0.5;
        off_y = 0.0;
        draw();
        
        $("#zoomOutput").val( 1 / zoom);
        $("#centerOffsetXOutput").val(off_x);
        $("#centerOffsetYOutput").val(off_y);
    });
    
    canvas.mousedown(function( event ) {
        posX = event.pageX - $(this).offset().left;
        posY = event.pageY - $(this).offset().top;
    });
    
    canvas.mouseup(function( event ) {
        posX = event.pageX - $(this).offset().left - posX;
        posY = event.pageY - $(this).offset().top - posY;
        
        off_x -= 2. * posX * zoom / $(this).width();
        off_y += 2. * posY * zoom / $(this).height();
        
        draw();
    });
    
    $("#iterations").change(function(){
       	compile();
        draw(); 
    });
});